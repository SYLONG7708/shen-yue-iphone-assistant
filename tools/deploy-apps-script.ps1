param(
  [string]$ScriptId = $env:SHEN_YUE_APPS_SCRIPT_ID,
  [string]$DeploymentId = "AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg",
  [string]$Description = "",
  [switch]$InstallClasp,
  [switch]$Login,
  [switch]$CreateNewDeployment,
  [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
}

function Get-ClaspCommand {
  $command = Get-Command clasp -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  if ($InstallClasp) {
    Write-Host "Installing @google/clasp globally with npm ..."
    & npm install @google/clasp -g
    if ($LASTEXITCODE -ne 0) { throw "Failed to install @google/clasp." }

    $command = Get-Command clasp -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
  }

  throw "clasp not found. Install it with: npm install @google/clasp -g"
}

function Read-LocalScriptId([string]$ProjectRoot) {
  $claspJsonPath = Join-Path $ProjectRoot ".clasp.json"
  if (-not (Test-Path -LiteralPath $claspJsonPath)) { return "" }

  $config = Get-Content -Raw -Encoding UTF8 -LiteralPath $claspJsonPath | ConvertFrom-Json
  if ($config.scriptId) { return [string]$config.scriptId }
  return ""
}

function Invoke-ClaspCommand([string]$ClaspPath, [string[]]$Arguments, [string]$Label) {
  Write-Host "Running: clasp $($Arguments -join ' ')"
  $output = & $ClaspPath @Arguments 2>&1
  $text = ($output | Out-String).Trim()
  if ($text) { Write-Host $text }

  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed.`n$text"
  }
  return $text
}

function Get-VersionNumber([string]$VersionOutput) {
  $versionMatch = [regex]::Match($VersionOutput, "(?i)version\s+(\d+)")
  if ($versionMatch.Success) { return [int]$versionMatch.Groups[1].Value }

  $lineMatch = [regex]::Match($VersionOutput, "(?m)^\s*(\d+)\s*$")
  if ($lineMatch.Success) { return [int]$lineMatch.Groups[1].Value }

  throw "Could not read the new Apps Script version number from clasp output."
}

function Get-DeploymentIdFromText([string]$Text) {
  $match = [regex]::Match($Text, "AKfycb[0-9A-Za-z_-]+")
  if ($match.Success) { return $match.Value }
  return ""
}

function Get-LatestDeploymentId([string]$ClaspPath, [string]$ScriptId) {
  $output = Invoke-ClaspCommand -ClaspPath $ClaspPath -Arguments @("deployments", $ScriptId) -Label "clasp deployments"
  $ids = [regex]::Matches($output, "AKfycb[0-9A-Za-z_-]+") | ForEach-Object { $_.Value }
  if ($ids.Count -gt 0) { return $ids[-1] }
  return ""
}

function Test-AppsScriptWebApp([string]$DeploymentId) {
  if (-not $DeploymentId) { return }

  $uri = "https://script.google.com/macros/s/$DeploymentId/exec?type=updates"
  $lastError = ""
  $node = Get-Command node -ErrorAction SilentlyContinue

  for ($attempt = 1; $attempt -le 4; $attempt += 1) {
    try {
      if ($node) {
        $script = "fetch(process.argv[1], { redirect: 'follow' }).then(async (response) => { const data = await response.json(); if (!Array.isArray(data.apps)) throw new Error('Response did not include apps.'); console.log('Verified Apps Script update manifest: ' + data.apps.length + ' apps.'); }).catch((error) => { console.error(error.message || error); process.exit(1); });"
        $output = & node -e $script $uri 2>&1
        $text = ($output | Out-String).Trim()
        if ($LASTEXITCODE -eq 0) {
          if ($text) { Write-Host $text }
          return
        }
        $lastError = $text
      } else {
        $result = Invoke-RestMethod -Method Get -Uri $uri -TimeoutSec 30
        if ($null -ne $result.apps) {
          Write-Host "Verified Apps Script update manifest: $($result.apps.Count) apps."
          return
        }
        $lastError = "Response did not include apps."
      }
    } catch {
      $lastError = $_.Exception.Message
    }
    Start-Sleep -Seconds 4
  }

  throw "Apps Script deploy finished, but verification failed: $lastError"
}

$projectRoot = Get-ProjectRoot
$scriptId = if ($ScriptId) { $ScriptId } else { Read-LocalScriptId $projectRoot }
if (-not $scriptId) {
  throw "Missing Apps Script Script ID. Pass -ScriptId, create .clasp.json, or set SHEN_YUE_APPS_SCRIPT_ID."
}

$descriptionText = if ($Description) { $Description } else { "auto-update-center" }
$effectiveDeploymentId = if ($CreateNewDeployment) { "" } else { $DeploymentId }
$clasp = Get-ClaspCommand

if ($Login) {
  Write-Host "Opening Google login for clasp ..."
  & $clasp login
  if ($LASTEXITCODE -ne 0) { throw "clasp login failed." }
}

$clasprcPath = Join-Path $HOME ".clasprc.json"
if (-not (Test-Path -LiteralPath $clasprcPath)) {
  Write-Warning "clasp is not logged in. Run this script once with -Login, or run: clasp login"
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("shen-yue-apps-script-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$codePath = Join-Path $projectRoot "Code.gs"
$manifestPath = Join-Path $projectRoot "appsscript.json"
if (-not (Test-Path -LiteralPath $codePath)) { throw "Missing Code.gs: $codePath" }
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Missing appsscript.json: $manifestPath" }

Copy-Item -LiteralPath $codePath -Destination (Join-Path $tempRoot "Code.gs") -Force
Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $tempRoot "appsscript.json") -Force

$claspConfig = [ordered]@{
  scriptId = $scriptId
  rootDir = "."
}
$claspConfig | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $tempRoot ".clasp.json")

Push-Location $tempRoot
try {
  Invoke-ClaspCommand -ClaspPath $clasp -Arguments @("push", "-f") -Label "clasp push" | Out-Null
  $versionOutput = Invoke-ClaspCommand -ClaspPath $clasp -Arguments @("version", $descriptionText) -Label "clasp version"
  $versionNumber = Get-VersionNumber $versionOutput

  if ($effectiveDeploymentId) {
    Invoke-ClaspCommand -ClaspPath $clasp -Arguments @("redeploy", $effectiveDeploymentId, "-V", [string]$versionNumber, "-d", $descriptionText) -Label "clasp redeploy" | Out-Null
    Write-Host "Redeployed existing web app:"
    Write-Host "https://script.google.com/macros/s/$effectiveDeploymentId/exec"
  } else {
    $deployOutput = Invoke-ClaspCommand -ClaspPath $clasp -Arguments @("deploy", "-V", [string]$versionNumber, "-d", $descriptionText) -Label "clasp deploy"
    $effectiveDeploymentId = Get-DeploymentIdFromText $deployOutput
    if (-not $effectiveDeploymentId) {
      $effectiveDeploymentId = Get-LatestDeploymentId -ClaspPath $clasp -ScriptId $scriptId
    }
    if (-not $effectiveDeploymentId) {
      throw "Created a new Apps Script deployment, but could not read the deployment ID."
    }
    Write-Host "Created new web app:"
    Write-Host "https://script.google.com/macros/s/$effectiveDeploymentId/exec"
  }
} finally {
  Pop-Location
}

if (-not $SkipVerify -and $effectiveDeploymentId) {
  Test-AppsScriptWebApp $effectiveDeploymentId
}

Write-Host "Done."
