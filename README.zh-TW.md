# 申悅車機助手

## 本次版本

- 版本：1.0.10-live 工具更新
- 重點：更新中心保留 APK 自動偵測，並改用低權限 Apps Script JSON 儲存，避免 Google 封鎖敏感授權。
- 支援：套件名維持 `tw.com.shenyue.assistant`，可覆蓋更新原本雲端版或 APK 版 App。

## 更新中心上傳

- 更新中心新增公開一鍵上傳頁：`update-uploader/index.html`。
- 公開頁需搭配 `SYLONG7708/update` 專案的 `tools/start-update-uploader.ps1` 後端工具；選 APK 後可直接新增或替換 `apk-cloud` Release 資產、更新 `updates.json` 並同步 Apps Script。
- 公開頁已支援「替換既有 APK」與「新增新的 APK」兩種模式；新增時可填 App 顯示名稱、分類、介紹、圖標網址、詳情圖片網址與更新說明，未填會用 APK 內部資訊與預設圖片補齊。
- 更新中心頁面新增繁體中文表格式上傳表單。
- 新增 App 時選 APK、第一張圖片、第二張圖片即可；應用圖標、應用名稱、類別、介紹、App 容量、套件名稱、版本名稱、版本碼、最低 Android、目標 SDK 與 SHA-256 會自動偵測。
- 若 APK 無法在目前瀏覽器解析，仍保留手動填寫欄位作為備援。
- 按「儲存並上傳」後會送到 Google Apps Script，寫入低權限 JSON 儲存；圖片與 APK 請使用公開網址。
- 更新清單可由 Apps Script `?type=updates` 輸出，目前已種入 9 筆本機 `updates.json` 內容。
- `tools/deploy-apps-script.ps1` 可自動上傳 `Code.gs`、建立版本、重新部署既有 Apps Script `/exec` 網址。
- 大型 APK 建議使用 `tools/publish-update-app.ps1` 發布到 GitHub Releases；加上 `-SyncAppsScript` 可把同一筆更新自動寫入 Apps Script 工作表。
- 操作教學：`docs/update-center-upload-guide.html`。

## APK

建置輸出位於：

```text
releases/1.0.8-cloud-upload-filechooser/
```

- `shen-yue-assistant-1.0.8-cloud-upload-filechooser-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - 安裝一次即可，每次打開 App 都會重新抓 GitHub Pages 最新內容。
  - 已關閉 WebView 快取並清除 service worker 快取，避免車機看到舊畫面。
  - 內建 `ShenYueUpdater` 原生介面，可在更新中心下載 APK 並開啟 Android 安裝確認。
  - 內建 WebView 檔案選擇器，可在 APK 內正常選圖片與 APK 檔案。

## 本機建置

```powershell
$env:ANDROID_HOME='C:\Users\Administrator\Android\Sdk'
$env:ANDROID_SDK_ROOT='C:\Users\Administrator\Android\Sdk'
C:\Users\Administrator\shen-yue-iphone-assistant\.tools\gradle-9.1.0\bin\gradle.bat --no-daemon :app:assembleLiveDebug
```

## GitHub 發布工具

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\publish-update-app.ps1 `
  -ApkPath "C:\路徑\app.apk" `
  -Name "App 顯示名稱" `
  -PackageName "com.example.app" `
  -VersionCode 100 `
  -VersionName "1.0.0" `
  -IconPath "C:\路徑\icon.png" `
  -FirstImagePath "C:\路徑\photo-1.png" `
  -SecondImagePath "C:\路徑\photo-2.png"
```

## Apps Script 自動部署

目前已完成 Google 登入與低權限部署：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\deploy-apps-script.ps1 `
  -ScriptId "1HUOf9VUijyDLDCRrpGNJySVp-xuFvq7MWqUBVju3jPjxS7VnDgqmJdE7" `
  -DeploymentId "AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg"
```

之後正式發布 APK 並同步 Apps Script：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\publish-update-app.ps1 `
  -ApkPath "C:\路徑\app.apk" `
  -Name "App 顯示名稱" `
  -AppsScriptId "1HUOf9VUijyDLDCRrpGNJySVp-xuFvq7MWqUBVju3jPjxS7VnDgqmJdE7" `
  -DeployAppsScript `
  -SyncAppsScript
```
