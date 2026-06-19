# 1.0.26 Replay Auto QR

本版針對回放中心選取影片後無法立即產生 QR、等待預覽或轉檔太久的情況調整流程。

## 修改內容

- 回放中心移除可見的影片預覽面板。
- QR 面板移到右側第一個區塊，進入回放中心後更靠上顯示。
- 車機 USB 影片選取後自動開始上傳並產生 QR，不再等待預覽或 TS 轉 MP4。
- 車機影片上傳改優先使用 `uploadLocalVideoOriginal()`，直接讀取原始檔，加快上傳啟動流程。
- 一般檔案選取後也會自動上傳並產生 QR。
- 若影片已上傳成功但一次性 QR API 暫時失敗，會先顯示影片直連 QR，不再停在沒有 QR 的狀態。
- 更新 service worker cache name：
  - `shen-yue-assistant-v237-replay-auto-qr`
  - `replay-center-v9-auto-qr`

## APK

- `ShenYueAssistant-1.0.26-replay-auto-qr-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `126`
  - versionName: `1.0.26-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `CBA7C55ABC8241EE3B892C905EE688CED3B82D6441D7AEBF5B0DEF6CD5E3BE43`

- `ShenYueAssistant-1.0.26-replay-auto-qr-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `126`
  - versionName: `1.0.26-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `F03A2720372D314F48BCECE9294776AC188A12F2FC2D35EC22147EE3C5B1492A`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 均為 versionCode `126`、targetSdkVersion `28`。
- `aapt2 dump badging` 確認包含網路、外部儲存、影片讀取與所有檔案管理權限。
- 確認 built-in 與 legacy APK 內建 `assets/www/replay-center/index.html` 不含可見的 `影片預覽`，並包含 `qr-panel`。
- 確認 built-in 與 legacy APK 內建 `assets/www/replay-center/compat-app.js` 包含 `autoUploadTimer`、`direct-fallback`、`uploadOriginal`。
- 確認 built-in 與 legacy APK 內建 service worker 包含新版 cache name。
- `git diff --check` 無空白錯誤，僅 Windows 換行提示。
