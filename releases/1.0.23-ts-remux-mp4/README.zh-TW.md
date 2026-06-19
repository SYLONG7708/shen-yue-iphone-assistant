# 1.0.23 TS Remux MP4 Playback Fix

本版修正回放中心已可掃描 USB Camera 影片，但選取後無法預覽，且掃描 QR 後手機瀏覽器無法播放的問題。

## 根因

車機錄影檔目前多為 `.ts` / `.mts` / `.m2ts`。回放中心 1.0.22 已能掃描與上傳這些檔案，但 Android WebView 與手機瀏覽器通常不能直接播放 MPEG-TS 容器，因此會出現：

- 回放中心選取影片後預覽無法播放。
- 上傳後產生 QR，手機進入觀看頁仍無法播放。

## 修改內容

- Android 原生橋接新增 `prepareLocalVideo()`。
- 選取 TS/MTS/M2TS 車機影片時，先用 Android `MediaExtractor` + `MediaMuxer` 將 TS 容器 remux 成 MP4 暫存檔。
- 不重新編碼影片，只改封裝為 MP4；可保留原始畫質並降低處理時間。
- 回放中心預覽改用準備好的 MP4。
- 上傳與一次性 QR 連結也改用同一個 MP4，避免手機瀏覽器收到原始 TS。
- `uploadLocalVideo()` 也加入保護：如果前端未先準備，原生上傳前仍會嘗試把 TS remux 成 MP4。
- 更新 service worker cache name：
  - `shen-yue-assistant-v234-ts-remux-mp4`
  - `replay-center-v6-ts-remux-mp4`

## APK

- `ShenYueAssistant-1.0.23-ts-remux-mp4-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `123`
  - versionName: `1.0.23-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `38D26BEA926A0737BA577E5E5C0A2DE4EF442C1D77E4C68958EAAE342A3496C2`

- `ShenYueAssistant-1.0.23-ts-remux-mp4-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `123`
  - versionName: `1.0.23-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `44A12D75F0F3FE3B10C007754A56A13C127FF566D66C90958309BFB7E41FBA7C`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 均為 versionCode `123`、targetSdkVersion `28`。
- `aapt2 dump permissions` 確認包含：
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
  - `READ_MEDIA_VIDEO`
  - `MANAGE_EXTERNAL_STORAGE`
- 確認 built-in APK 內建 `assets/www/replay-center/compat-app.js` 包含 `prepareLocalVideo` 與 `uploadUri`。
- `git diff --check` 無空白錯誤。

## 注意

本版是 remux，不是重新轉碼。若某台車機產生的 TS 內部影片/音訊編碼不是 Android `MediaMuxer` 可寫入 MP4 的格式，App 會顯示 TS 轉 MP4 失敗；這種情況需要拿到該 TS 樣本再做更進一步轉碼或相容處理。
