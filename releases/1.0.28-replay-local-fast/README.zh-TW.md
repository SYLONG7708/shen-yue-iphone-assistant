# 1.0.28 Replay Local Fast QR

本版針對回放中心上傳 60MB 左右影片卡在 `2%` 的情況，新增最快且不改畫質的「本機快速 QR」流程。車機直接提供本機影片連結，手機掃 QR 後從車機讀取影片，不需要先把影片上傳到雲端。

## 修改內容

- Android APK 內新增本機影片 HTTP 服務，支援 `GET`、`HEAD`、`Range`。
- 回放中心在 Android APK 模式下優先建立 `local-fast` QR，不先上傳 60MB 影片。
- 本機快速 QR 成功時直接顯示 QR，影片品質維持原始檔，不壓縮、不轉碼。
- 手機需與車機在同一個 Wi-Fi / 熱點網路，才能開啟本機快速 QR。
- 若本機快速 QR 建立失敗，前端會退回原本雲端上傳流程。
- 手動檔案選取與 USB 掃描選取都支援本機快速 QR：
  - `createLocalVideoShare()`
  - `createLastSelectedVideoShare()`
- 更新 service worker cache name：
  - `shen-yue-assistant-v239-replay-local-fast`
  - `replay-center-v11-local-fast`

## APK

- `ShenYueAssistant-1.0.28-replay-local-fast-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `128`
  - versionName: `1.0.28-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `7AE70A2F54BDAA78F3509E7F773614E8954C80F442825610909329DD3D2B20CA`

- `ShenYueAssistant-1.0.28-replay-local-fast-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `128`
  - versionName: `1.0.28-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `D07D59CD4F0BBBCD8C110660486971FB66B8797CB790991EDBCB018626C71CDE`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 均為 versionCode `128`、targetSdkVersion `28`。
- `aapt2 dump badging` 確認包含網路、外部儲存、影片讀取與所有檔案管理權限。
- 確認 built-in 與 legacy APK 內建 `assets/www/replay-center/compat-app.js` 包含 `local-fast`、`createLocalVideoShare`、`createLastSelectedVideoShare`。
- 確認 Android `UpdateBridge.java` 包含 `ServerSocket`、`serveLocalVideo`、`Accept-Ranges`、`LocalVideoShare`。
- 確認 built-in 與 legacy APK 內建 service worker 包含新版 cache name。
- `git diff --check` 無空白錯誤，僅 Windows 換行提示。
