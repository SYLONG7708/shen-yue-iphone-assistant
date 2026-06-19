# 1.0.27 Replay Fast Progress

本版針對回放中心「選取檔案、上傳、產生二維碼太久」改善速度與進度顯示。影片採原始檔直傳，不壓縮、不轉碼，品質不變。

## 修改內容

- Android 原生影片上傳新增 `uploadLocalVideoOriginalAsync()`，改為背景上傳並可查詢進度。
- 前端每 300ms 輪詢 Android 上傳狀態，進度條顯示實際 `0% - 100%` 百分比。
- 上傳串流 buffer 由 64KB 提升到 256KB，減少大影片傳輸開銷。
- 已知檔案大小時使用 fixed-length streaming；POST multipart 也會計算完整長度後直傳。
- 車機 USB 影片仍使用原始檔直傳，不做壓縮或轉碼，維持原畫質。
- 影片上傳完成後立即先顯示影片直連 QR，同時建立一次性連結；一次性連結成功後會替換 QR。
- 更新 service worker cache name：
  - `shen-yue-assistant-v238-replay-fast-progress`
  - `replay-center-v10-fast-progress`

## APK

- `ShenYueAssistant-1.0.27-replay-fast-progress-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `127`
  - versionName: `1.0.27-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `1108F609A8376711F95A1CBE58FD8AE590FF5F232C7B9C921B07B2A17F049696`

- `ShenYueAssistant-1.0.27-replay-fast-progress-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `127`
  - versionName: `1.0.27-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `2B59A7305E6BB670A287C1784E2C4C722B7E68FE76AC674B179CB1F6D089C392`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 均為 versionCode `127`、targetSdkVersion `28`。
- `aapt2 dump badging` 確認包含網路、外部儲存、影片讀取與所有檔案管理權限。
- 確認 built-in 與 legacy APK 內建 `assets/www/replay-center/index.html` 包含 `progressText` 與 `progress-percent`。
- 確認 built-in 與 legacy APK 內建 `assets/www/replay-center/compat-app.js` 包含 `uploadPollTimer`、`uploadLocalVideoOriginalAsync`、`direct-processing`。
- 確認 built-in 與 legacy APK 內建 service worker 包含新版 cache name。
- `git diff --check` 無空白錯誤，僅 Windows 換行提示。
