# Google Apps Script 自動上傳與部署設定

本專案已改成可用 `tools/deploy-apps-script.ps1` 自動上傳 `Code.gs` 並更新既有 Apps Script 網頁應用程式部署，不必每次到 Apps Script 後台手動貼上程式碼。

目前申悅助手網站固定使用的 Apps Script 部署網址：

```text
https://script.google.com/macros/s/AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg/exec
```

## 目前可用設定

- Google 帳號：`pppp77088@gmail.com`
- Apps Script 指令碼 ID：`1HUOf9VUijyDLDCRrpGNJySVp-xuFvq7MWqUBVju3jPjxS7VnDgqmJdE7`
- 部署 ID：`AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg`
- 儲存方式：低權限 `PropertiesService` JSON，不使用 Google Drive / Sheets 敏感授權。

重新部署：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\deploy-apps-script.ps1 `
  -ScriptId "1HUOf9VUijyDLDCRrpGNJySVp-xuFvq7MWqUBVju3jPjxS7VnDgqmJdE7" `
  -DeploymentId "AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg"
```

若 Google 封鎖 `clasp login --use-project-scopes`，不要再要求敏感 scopes；目前低權限版不需要該授權。

工具會自動：

- 上傳 `Code.gs` 與 `appsscript.json`。
- 建立新的 Apps Script 版本。
- 重新部署既有 `/exec` 網頁應用程式網址。
- 讀取 `?type=updates` 驗證更新清單有回傳 `apps`。

目前驗證通過：

```powershell
node -e "fetch('https://script.google.com/macros/s/AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg/exec?type=updates',{redirect:'follow'}).then(async r=>console.log(await r.text()))"
```

更新中心前端會讀取同一個 Apps Script 的 `?type=updates`，例如：

```text
https://script.google.com/macros/s/AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg/exec?type=updates
```

若雲端清單暫時無法讀取，App 會退回內建 `updates.json`。

## 大型 APK 自動發布

低權限 Apps Script 不保存 APK 或圖片檔，只保存更新清單 JSON。大型 APK 建議改用本機工具，工具可同時發布 GitHub Release、更新 `updates.json`，並把同一筆資料同步寫入 Apps Script：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\publish-update-app.ps1 `
  -ApkPath "C:\路徑\app.apk" `
  -Name "App 名稱" `
  -PackageName "com.example.app" `
  -VersionCode 100 `
  -VersionName "1.0.0" `
  -AppsScriptId "1HUOf9VUijyDLDCRrpGNJySVp-xuFvq7MWqUBVju3jPjxS7VnDgqmJdE7" `
  -DeployAppsScript `
  -SyncAppsScript
```

若 `Code.gs` 已經是新版，可省略 `-DeployAppsScript`，只保留 `-SyncAppsScript`。完整教學在 `docs/update-center-upload-guide.html`。
