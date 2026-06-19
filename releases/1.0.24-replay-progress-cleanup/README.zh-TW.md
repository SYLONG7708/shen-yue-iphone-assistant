# 1.0.24 Replay Progress and UI Cleanup

本版依使用者回報調整回放中心操作體驗。

## 修改內容

- TS/MTS/M2TS 轉 MP4 改成 Android 背景任務。
- 新增 `prepareLocalVideoAsync()` 與 `getLocalVideoPrepareStatus()` 原生橋接。
- 回放中心點選 TS 影片時不再卡住畫面，改為輪詢背景任務並更新進度條。
- 若 Android 可讀到影片時長，顯示實際百分比；若讀不到時長，顯示不確定進度動畫。
- TS 轉 MP4 成功前禁用上傳，避免原始 TS 被上傳後 QR 仍無法播放。
- 移除回放中心標題下方「雷霆模擬器上傳測試版」文字。
- 隱藏回放中心手動選檔虛線框與其中提示文字，車機主要使用 USB 掃描清單。
- 隱藏首頁 hero 大字「車機教學、保固資料、售後聯絡」與上方英文小字。
- 更新 service worker cache name：
  - `shen-yue-assistant-v235-replay-progress-cleanup`
  - `replay-center-v7-progress-cleanup`

## APK

- `ShenYueAssistant-1.0.24-replay-progress-cleanup-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `124`
  - versionName: `1.0.24-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `D39F6B4CC83F8FD469D4D6348621C2FCEF1E52E95B2D29D8D87ADDA7B33D586E`

- `ShenYueAssistant-1.0.24-replay-progress-cleanup-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `124`
  - versionName: `1.0.24-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `58B2EBFBCAC9DAE498AF7692995E4B8A520F45279262A92F69ABF2FDA350383C`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 均為 versionCode `124`、targetSdkVersion `28`。
- `aapt2 dump permissions` 確認 built-in 版包含外部儲存與影片讀取權限。
- 確認 built-in APK 內建 `assets/www/replay-center/compat-app.js` 包含 `prepareLocalVideoAsync`、`getLocalVideoPrepareStatus`、`progressWrap`。
- 確認 built-in APK 內建 `assets/www/replay-center/index.html`：
  - 包含 `progressWrap`
  - 包含 `is-indeterminate`
  - 不含「雷霆模擬器上傳測試版」
  - 不含「選擇 MP4 / TS / MOV 影片」
  - 選檔框為 `display: none`
- 確認 built-in APK 內建 `assets/www/styles.css` 包含首頁 hero 大字隱藏規則。
- `git diff --check` 無空白錯誤。
