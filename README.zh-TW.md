# 申悅車機助手

## 本次版本

- 版本：1.0.3
- 重點：更新中心新增與修改需要管理 PIN，且不再顯示預設密碼提示。
- 支援：修改 APK 名稱、圖標與圖片可先儲存在本機正式清單，暫不送雲端。

## 更新中心上傳

- 更新中心頁面新增繁體中文表格式上傳表單。
- 可填寫應用圖標、應用名稱、類別名稱、應用介紹、兩張圖片、APK 下載地址或 APK 檔案、App 容量與進階版本資訊。
- 按「儲存並上傳雲端」後會送到 Google Apps Script，寫入 `更新中心上傳` 工作表；有選擇檔案時會保存到 Google Drive。
- 更新清單可由 Apps Script `?type=updates` 輸出，並自動合併原本 GitHub `updates.json` 內容。

## APK

建置輸出位於：

```text
releases/1.0.3-pin-update-editor/
```

- `shen-yue-assistant-1.0.3-github-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - 會載入 GitHub Pages 線上網頁。
  - 適合更新原本安裝的 GitHub 版 App。

- `shen-yue-assistant-1.0.3-builtin-debug.apk`
  - 套件名：`tw.com.shenyue.assistant.builtin`
  - 內建網頁與圖片資源。
  - 會和 GitHub 版分開安裝。

## 本機建置

```powershell
$env:ANDROID_HOME='C:\Users\Administrator\Android\Sdk'
$env:ANDROID_SDK_ROOT='C:\Users\Administrator\Android\Sdk'
C:\Users\Administrator\shen-yue-iphone-assistant\.tools\gradle-9.1.0\bin\gradle.bat --no-daemon :app:assembleGithubDebug :app:assembleBuiltInDebug
```
