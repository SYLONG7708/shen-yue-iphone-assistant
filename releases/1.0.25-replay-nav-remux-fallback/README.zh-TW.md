# 1.0.25 Replay Navigation and Remux Fallback

本版依使用者回報修正回放中心選到影片後仍無法讀取、無法產生 QR 的情況，並調整首頁按鈕位置。

## 修改內容

- TS/MTS/M2TS remux 時只加入 MP4 容器穩定支援的第一條影片軌與第一條可支援音訊軌。
- 若車機 TS 的音訊軌不支援 MP4，會跳過音訊軌，不再讓整個影片準備流程失敗。
- 新增 `uploadLocalVideoOriginal()` 原生橋接。
- 若 TS 無法準備成 MP4，回放中心仍可上傳原始影片產生 QR；手機端可能需下載或用外部播放器。
- 上傳正常情況仍優先使用 MP4 暫存檔，只有 MP4 準備失敗才使用原始檔保底。
- 首頁五個功能按鈕移到頂部導覽列，位於 LINE / 電話 / 安裝左側，保留原順序：
  - 影片教學
  - 保固紀錄
  - 更新中心
  - 聯絡申悅
  - 回放中心
- 原 hero 區移除按鈕後縮短高度，讓整體畫面往上。
- 更新 service worker cache name：
  - `shen-yue-assistant-v236-replay-nav-remux-fallback`
  - `replay-center-v8-remux-fallback`

## APK

- `ShenYueAssistant-1.0.25-replay-nav-remux-fallback-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `125`
  - versionName: `1.0.25-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `18A819BE0F992B86813735A7122BB4CDBDAB502207C8721702635768C27DDDE6`

- `ShenYueAssistant-1.0.25-replay-nav-remux-fallback-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `125`
  - versionName: `1.0.25-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `74F126049D258F80AA1582B8DBC394F1EFA830318672E8DF5DB929DDBCF691C6`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 均為 versionCode `125`、targetSdkVersion `28`。
- `aapt2 dump permissions` 確認包含外部儲存與影片讀取權限。
- 確認 built-in 與 legacy APK 內建 `assets/www/replay-center/compat-app.js` 包含 `uploadLocalVideoOriginal`、`uploadOriginal`、`prepareLocalVideoAsync`。
- 確認 built-in 與 legacy APK 內建 `assets/www/index.html` 只有一個 `hero-actions`，且位於 header actions 前。
- 確認 APK 內建 `assets/www/styles.css` 包含頂部導覽列按鈕規則與 hero 高度縮短規則。
- `git diff --check` 無空白錯誤。
