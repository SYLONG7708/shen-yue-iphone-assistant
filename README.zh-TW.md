# 申悅車機助手

## 本次版本

- 版本：1.0.6
- 重點：新增即時更新版 APK，安裝一次後每次開啟都強制抓 GitHub 最新內容。
- 支援：套件名維持 `tw.com.shenyue.assistant`，可覆蓋更新原本雲端版或 APK 版 App。

## 更新中心上傳

- 更新中心頁面新增繁體中文表格式上傳表單。
- 可填寫應用圖標、應用名稱、類別名稱、應用介紹、兩張圖片、APK 下載地址或 APK 檔案、App 容量與進階版本資訊。
- 按「儲存並上傳雲端」後會送到 Google Apps Script，寫入 `更新中心上傳` 工作表；有選擇檔案時會保存到 Google Drive。
- 更新清單可由 Apps Script `?type=updates` 輸出，並自動合併原本 GitHub `updates.json` 內容。

## APK

建置輸出位於：

```text
releases/1.0.6-live-update/
```

- `shen-yue-assistant-1.0.6-live-update-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - 安裝一次即可，每次打開 App 都會重新抓 GitHub Pages 最新內容。
  - 已關閉 WebView 快取並清除 service worker 快取，避免車機看到舊畫面。

## 本機建置

```powershell
$env:ANDROID_HOME='C:\Users\Administrator\Android\Sdk'
$env:ANDROID_SDK_ROOT='C:\Users\Administrator\Android\Sdk'
C:\Users\Administrator\shen-yue-iphone-assistant\.tools\gradle-9.1.0\bin\gradle.bat --no-daemon :app:assembleLiveDebug
```
