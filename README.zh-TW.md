# 申悅車機助手

## 本次版本

- 版本：1.0.8
- 重點：更新中心補上 Android APK 內檔案選擇器，圖片與小型 APK 可送 Google Apps Script；大型 APK 提供 GitHub Releases 發布工具。
- 支援：套件名維持 `tw.com.shenyue.assistant`，可覆蓋更新原本雲端版或 APK 版 App。

## 更新中心上傳

- 更新中心頁面新增繁體中文表格式上傳表單。
- 可填寫應用圖標、應用名稱、類別名稱、應用介紹、兩張圖片、APK 下載地址或小型 APK 檔案、App 容量、套件名稱與版本碼。
- 按「儲存並上傳」後會送到 Google Apps Script，寫入 `更新中心上傳` 工作表；有選擇圖片或小型 APK 時會保存到 Google Drive。
- 更新清單可由 Apps Script `?type=updates` 輸出，並自動合併原本 GitHub `updates.json` 內容。
- 大型 APK 建議使用 `tools/publish-update-app.ps1` 發布到 GitHub Releases，再把產生的 APK 下載網址寫入更新清單。
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
