param(
  [Parameter(Mandatory = $true)]
  [string]$ApkPath,

  [Parameter(Mandatory = $true)]
  [string]$Name,

  [string]$PackageName = "",

  [int]$VersionCode = 0,

  [string]$VersionName = "",

  [string]$Category = "Other apps",
  [string]$Description = "No description.",
  [string]$IconPath = "",
  [string]$FirstImagePath = "",
  [string]$SecondImagePath = "",
  [string]$MinAndroid = "By APK",
  [string]$TargetSdk = "",
  [string]$ReleaseTag = "apk-cloud",
  [string]$UpdateRepo = "SYLONG7708/update",
  [string]$AssistantPagesBase = "https://sylong7708.github.io/shen-yue-iphone-assistant",
  [switch]$SkipUpdateRepoPush,
  [string]$AppsScriptDeploymentId = "AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg",
  [string]$AppsScriptEndpoint = "",
  [string]$AppsScriptId = "",
  [switch]$DeployAppsScript,
  [switch]$SyncAppsScript
)

$ErrorActionPreference = "Stop"

if (-not $AppsScriptEndpoint -and $AppsScriptDeploymentId) {
  $AppsScriptEndpoint = "https://script.google.com/macros/s/$AppsScriptDeploymentId/exec"
}

function Resolve-RequiredFile([string]$Path, [string]$Label) {
  if (-not $Path) { return "" }
  $item = Get-Item -LiteralPath $Path -ErrorAction Stop
  if (-not $item.PSIsContainer) { return $item.FullName }
  throw "$Label must be a file: $Path"
}

function New-Slug([string]$Value) {
  $slug = $Value.ToLowerInvariant() -replace '[^a-z0-9._-]+', '-'
  $slug = $slug -replace '-+', '-'
  $slug = $slug.Trim('-')
  if ($slug) { return $slug }
  return "shen-yue-app"
}

function Find-Aapt {
  $command = Get-Command aapt -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $sdkRoots = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    "$env:LOCALAPPDATA\Android\Sdk"
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  foreach ($root in $sdkRoots) {
    $match = Get-ChildItem -LiteralPath $root -Recurse -Filter aapt.exe -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($match) { return $match.FullName }
  }
  return ""
}

function Read-ApkBadging([string]$Path) {
  $aapt = Find-Aapt
  if (-not $aapt) { return @{} }

  $output = & $aapt dump badging $Path 2>$null
  $packageLine = $output | Where-Object { $_ -match "^package:" } | Select-Object -First 1
  if (-not $packageLine) { return @{} }

  $result = @{}
  if ($packageLine -match "name='([^']+)'") { $result.PackageName = $Matches[1] }
  if ($packageLine -match "versionCode='([^']+)'") { $result.VersionCode = [int]$Matches[1] }
  if ($packageLine -match "versionName='([^']+)'") { $result.VersionName = $Matches[1] }
  return $result
}

function Copy-AssetFile([string]$SourcePath, [string]$TargetDir, [string]$BaseName, [string]$Suffix, [string]$PagesBase) {
  if (-not $SourcePath) { return "" }
  $source = Get-Item -LiteralPath $SourcePath -ErrorAction Stop
  $extension = $source.Extension
  if (-not $extension) { $extension = ".png" }
  New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
  $fileName = "$BaseName-$Suffix$extension"
  $target = Join-Path $TargetDir $fileName
  Copy-Item -LiteralPath $source.FullName -Destination $target -Force
  $relative = (Resolve-Path -LiteralPath $target).Path.Substring((Resolve-Path -LiteralPath $PSScriptRoot\..).Path.Length + 1).Replace('\', '/')
  return "$PagesBase/$relative"
}

function Read-JsonFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return [ordered]@{
      schema = 1
      channel = "stable"
      updatedAt = ""
      apps = @()
    }
  }
  return Get-Content -Raw -Encoding UTF8 -LiteralPath $Path | ConvertFrom-Json
}

function Save-Manifest([string]$Path, [object]$Manifest, [object]$Item) {
  $apps = @()
  if ($Manifest.apps) {
    $apps = @($Manifest.apps | Where-Object {
      $_.packageName -ne $Item.packageName -and $_.id -ne $Item.id
    })
  }
  $Manifest.schema = 1
  $Manifest.channel = if ($Manifest.channel) { $Manifest.channel } else { "stable" }
  $Manifest.updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  $Manifest.apps = @($Item) + $apps
  $json = $Manifest | ConvertTo-Json -Depth 20
  Set-Content -Encoding UTF8 -LiteralPath $Path -Value $json
}

function Invoke-AppsScriptDeploy([string]$ScriptId, [string]$DeploymentId) {
  $deployScript = Join-Path $PSScriptRoot "deploy-apps-script.ps1"
  if (-not (Test-Path -LiteralPath $deployScript)) {
    throw "Apps Script deploy script not found: $deployScript"
  }

  $arguments = @(
    "-DeploymentId", $DeploymentId,
    "-Description", "auto-update-center"
  )
  if ($ScriptId) {
    $arguments += @("-ScriptId", $ScriptId)
  }

  Write-Host "Deploying Apps Script Code.gs before cloud sync ..."
  & $deployScript @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Apps Script deploy failed."
  }
}

function Sync-AppsScriptUpdate([string]$Endpoint, [object]$Item) {
  if (-not $Endpoint) {
    throw "AppsScriptEndpoint is required when -SyncAppsScript is used."
  }

  $gallery = @()
  if ($Item.galleryImages) { $gallery = @($Item.galleryImages) }

  $payload = [ordered]@{
    type = "update-center-app"
    updateApp = [ordered]@{
      manifestId = $Item.id
      appName = $Item.name
      name = $Item.name
      category = $Item.category
      description = $Item.description
      iconUrl = $Item.iconUrl
      firstImageUrl = if ($gallery.Count -ge 1) { $gallery[0] } else { $Item.imageUrl }
      secondImageUrl = if ($gallery.Count -ge 2) { $gallery[1] } else { "" }
      apkUrl = $Item.apkUrl
      sizeLabel = $Item.sizeLabel
      packageName = $Item.packageName
      versionName = $Item.versionName
      versionCode = $Item.versionCode
      minAndroid = $Item.minAndroid
      targetSdk = $Item.targetSdk
      sha256 = $Item.sha256
      note = "Synced by tools/publish-update-app.ps1"
    }
    files = @{}
  }

  $json = $payload | ConvertTo-Json -Depth 20
  Write-Host "Syncing update item to Apps Script ..."
  $response = Invoke-RestMethod -Method Post -Uri $Endpoint -Body $json -ContentType "text/plain;charset=utf-8" -TimeoutSec 60

  if ($response.ok -eq $false) {
    throw "Apps Script sync failed: $($response.message)"
  }
  if (-not $response.item) {
    throw "Apps Script did not return an update item. Redeploy Code.gs with tools/deploy-apps-script.ps1."
  }

  Write-Host "Synced Apps Script row: $($response.row)"
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$apk = Resolve-RequiredFile $ApkPath "APK"
$icon = Resolve-RequiredFile $IconPath "Icon"
$firstImage = Resolve-RequiredFile $FirstImagePath "First image"
$secondImage = Resolve-RequiredFile $SecondImagePath "Second image"

$badging = Read-ApkBadging $apk
if (-not $PackageName -and $badging.PackageName) { $PackageName = $badging.PackageName }
if ($VersionCode -le 0 -and $badging.VersionCode) { $VersionCode = $badging.VersionCode }
if (-not $VersionName -and $badging.VersionName) { $VersionName = $badging.VersionName }

if (-not $PackageName) {
  throw "PackageName is required. Pass -PackageName or install Android SDK aapt so it can be read from the APK."
}
if ($VersionCode -le 0) {
  throw "VersionCode is required. Pass -VersionCode or install Android SDK aapt so it can be read from the APK."
}
if (-not $VersionName) {
  $VersionName = "Unspecified"
}

$gh = (Get-Command gh -ErrorAction SilentlyContinue)
if (-not $gh) {
  throw "GitHub CLI 'gh' not found. Install or sign in to GitHub CLI first."
}

$slug = New-Slug "$PackageName-$VersionCode"
$apkAssetName = "$slug.apk"
$apkUploadPath = Join-Path ([System.IO.Path]::GetTempPath()) $apkAssetName
Copy-Item -LiteralPath $apk -Destination $apkUploadPath -Force

$apkSize = (Get-Item -LiteralPath $apk).Length
$sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $apk).Hash.ToLowerInvariant()
$sizeLabel = if ($apkSize -ge 1GB) {
  "{0:N2} GB" -f ($apkSize / 1GB)
} elseif ($apkSize -ge 1MB) {
  "{0:N1} MB" -f ($apkSize / 1MB)
} elseif ($apkSize -ge 1KB) {
  "{0:N0} KB" -f ($apkSize / 1KB)
} else {
  "$apkSize B"
}

$iconUrl = Copy-AssetFile $icon (Join-Path $repoRoot "assets\update-icons") $slug "icon" $AssistantPagesBase
$firstImageUrl = Copy-AssetFile $firstImage (Join-Path $repoRoot "assets\update-gallery") $slug "photo-1" $AssistantPagesBase
$secondImageUrl = Copy-AssetFile $secondImage (Join-Path $repoRoot "assets\update-gallery") $slug "photo-2" $AssistantPagesBase
$imageUrl = $firstImageUrl

$apkUrl = "https://github.com/$UpdateRepo/releases/download/$ReleaseTag/$apkAssetName"

$item = [ordered]@{
  id = $slug
  name = $Name
  packageName = $PackageName
  versionCode = $VersionCode
  versionName = $VersionName
  minAndroid = $MinAndroid
  targetSdk = $TargetSdk
  sizeLabel = $sizeLabel
  apkUrl = $apkUrl
  sha256 = $sha256
  imageUrl = if ($imageUrl) { $imageUrl } else { "$AssistantPagesBase/assets/update-splash.png" }
  iconUrl = if ($iconUrl) { $iconUrl } else { "$AssistantPagesBase/assets/app-logo.png" }
  galleryImages = @($firstImageUrl, $secondImageUrl) | Where-Object { $_ }
  category = $Category
  description = $Description
  changelog = @(
    "Added to Shen Yue update center",
    "Available for in-car download and install",
    "Published by publish-update-app.ps1"
  )
}

Write-Host "Uploading APK to GitHub Release $UpdateRepo/$ReleaseTag ..."
& gh release view $ReleaseTag --repo $UpdateRepo *> $null
if ($LASTEXITCODE -ne 0) {
  & gh release create $ReleaseTag --repo $UpdateRepo --title "APK Cloud" --notes "Shen Yue update center APK cloud files"
  if ($LASTEXITCODE -ne 0) { throw "Failed to create GitHub release $ReleaseTag." }
}

& gh release upload $ReleaseTag $apkUploadPath --repo $UpdateRepo --clobber
if ($LASTEXITCODE -ne 0) { throw "Failed to upload APK to GitHub release." }

$localManifestPath = Join-Path $repoRoot "updates.json"
$localManifest = Read-JsonFile $localManifestPath
Save-Manifest $localManifestPath $localManifest ([pscustomobject]$item)
Write-Host "Updated local manifest: $localManifestPath"

if (-not $SkipUpdateRepoPush) {
  $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("shen-yue-update-" + [Guid]::NewGuid().ToString("N"))
  git clone "https://github.com/$UpdateRepo.git" $tempRoot
  if ($LASTEXITCODE -ne 0) { throw "Failed to clone update repo." }

  $remoteManifestPath = Join-Path $tempRoot "updates.json"
  $remoteManifest = Read-JsonFile $remoteManifestPath
  Save-Manifest $remoteManifestPath $remoteManifest ([pscustomobject]$item)

  Push-Location $tempRoot
  try {
    git add updates.json
    git commit -m "Add $Name update item"
    if ($LASTEXITCODE -eq 0) {
      git push origin main
      if ($LASTEXITCODE -ne 0) { throw "Failed to push update repo." }
    } else {
      Write-Host "No remote manifest changes to commit."
    }
  } finally {
    Pop-Location
  }
}

if ($DeployAppsScript) {
  Invoke-AppsScriptDeploy -ScriptId $AppsScriptId -DeploymentId $AppsScriptDeploymentId
}

if ($SyncAppsScript) {
  Sync-AppsScriptUpdate -Endpoint $AppsScriptEndpoint -Item ([pscustomobject]$item)
}

Write-Host "Done."
Write-Host "APK URL: $apkUrl"
Write-Host "SHA-256: $sha256"
