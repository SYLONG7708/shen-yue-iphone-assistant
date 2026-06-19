# 1.0.29 Replay Local Fast No Fallback

本版針對使用者回報「回放中心點選檔案依然卡在 2%」修正。2% 代表本機快速 QR 沒成功後又退回雲端上傳，本版取消自動退回卡住路徑。

## 修改內容

- 本機快速 QR 會在檢查雲端上傳 API 前先執行，不再先進入雲端上傳狀態。
- 本機快速 QR 建立失敗時會停止流程並顯示原因，不再自動改用雲端上傳，避免再次卡在 `2%`。
- 失敗訊息會提示手機與車機需在同一個 Wi-Fi / 熱點網路。
- Android 新增 `ACCESS_WIFI_STATE` 權限，讓本機快速 QR 可在網卡列舉失敗時改用 Wi-Fi IP。
- 保留原本雲端上傳程式作為非 Android 或手動流程相容，但 Android APK 選片時優先本機快速 QR。
- 更新 service worker cache name：
  - `shen-yue-assistant-v240-replay-local-fast-no-fallback`
  - `replay-center-v12-local-fast-no-fallback`

## APK

- `ShenYueAssistant-1.0.29-replay-local-fast-no-fallback-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `129`
  - versionName: `1.0.29-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `C7046C8BBC2DA82D505E4D9FFBE94B233831953F8A57612EED716463B896AAF0`

- `ShenYueAssistant-1.0.29-replay-local-fast-no-fallback-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `129`
  - versionName: `1.0.29-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `808C76BB3CD941260C5EB555EC8EEEB3A6B3973AACEEF5FAA99D068F17DAD84E`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 均為 versionCode `129`、targetSdkVersion `28`。
- `aapt2 dump badging` 確認包含 `ACCESS_WIFI_STATE`、網路、外部儲存、影片讀取與所有檔案管理權限。
- 確認 APK 內建 `assets/www/replay-center/compat-app.js` 包含 `已停止雲端上傳，避免再次卡在 2%` 與 `local-fast`。
- 確認 APK 內建 service worker 包含新版 cache name。
- `git diff --check` 無空白錯誤，僅 Windows 換行提示。
