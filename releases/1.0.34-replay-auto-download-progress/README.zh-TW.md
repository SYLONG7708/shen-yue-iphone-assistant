# 申悅車機助手 1.0.34 - 回放自動下載進度版

日期：2026-07-09

## 重點

- 回放中心手機掃 QR 後，`local-fast` 連結預設自動下載，不需再按「下載 MP4」。
- 手機頁自動模式只顯示下載進度百分比與進度條。
- 下載前會先預熱車機本機 HTTP 影片，避免第一次只拿到短錯誤檔。
- 支援串流讀取 `Content-Length` 顯示真實下載百分比；瀏覽器不支援時會退回原生下載 URL。
- 車機影片掃描上限由 120 提升到 5000 筆，並補掃 `aw3603D`、`360res/aw3603D`、`DCIM`、`Movies`、`DVR`、`Record`、`DashCam`、內部儲存與 USB 常見掛載點。
- 支援 MP4、TS、MOV、AVI、MKV、WebM、3GP、DAV、264、H264 類影片檔。

## APK

- `ShenYueAssistant-1.0.34-replay-auto-download-progress-car-legacy-cloud-release-debug-signed.apk`
  - package：`tw.com.shenyue.assistant`
  - versionName：`1.0.34-car-legacy-cloud`
  - targetSdk：`28`
  - SHA-256：`00C5A9C86491155A6C681A2735673A74978C2289D15AC7052A676F0257A39371`

- `ShenYueAssistant-1.0.34-replay-auto-download-progress-car-legacy-cloud-debug.apk`
  - package：`tw.com.shenyue.assistant`
  - versionName：`1.0.34-car-legacy-cloud`
  - SHA-256：`826226B5A3209B3B4D56E0743A2C44E092FFE4434EDEBCFE0F5B60A9117A8C63`

- `ShenYueAssistant-1.0.34-replay-auto-download-progress-car-legacy-debug.apk`
  - package：`tw.com.shenyue.assistant`
  - versionName：`1.0.34-car-legacy`
  - SHA-256：`CF4CB2513880D58141E1FD29764AF7B5DDBD1A5636A9663AD92E1F5A4AE32638`

- `ShenYueAssistant-1.0.34-replay-auto-download-progress-car-legacy-built-in-debug.apk`
  - package：`tw.com.shenyue.assistant.builtin`
  - versionName：`1.0.34-car-legacy-built-in`
  - SHA-256：`26B5740FA6F8C09E3CDAF7503F75B66382499601893251B0C53CC8FF3E48899B`

- `ShenYueAssistant-1.0.34-replay-auto-download-progress-car-legacy-cloud-built-in-debug.apk`
  - package：`tw.com.shenyue.assistant.builtin`
  - versionName：`1.0.34-car-legacy-cloud-built-in`
  - SHA-256：`251BF5B7236CE4811ACFC24210C3C5B0B77FB9E7307AF9E5B808524FF35A0D7A`

## 使用建議

- 要覆蓋目前車機上的 `tw.com.shenyue.assistant`，優先使用 `car-legacy-cloud-release-debug-signed.apk` 或 `car-legacy-cloud-debug.apk`。
- `cloud` 版載入 GitHub Pages，推送網頁修正後可不重裝 APK 更新回放頁。
- `car-legacy` 版把網頁內建在 APK，適合離線測試，但網頁更新需重裝 APK。
