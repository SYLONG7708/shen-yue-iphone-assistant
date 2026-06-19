# 1.0.22 USB Camera TS Support

本版依使用者提供的車機截圖排解。

## 根因

截圖顯示回放中心已經讀到並檢查：

- `/storage/USB2/DCIM/Camera`
- `/storage/USB2/DCIM/camera`

車機檔案管理也顯示實際位置：

- `/storage/USB2/DCIM/Camera`

但該資料夾裡的影片檔是 `.ts`，例如：

- `20260618_11h10m47s.ts`
- `20260618_11h11m47s.ts`
- `20260618_11h12m47s.ts`

1.0.21 只掃 `.mp4`，因此路徑正確但清單仍空。

## 修改內容

- Android 原生掃描支援：
  - `.mp4`
  - `.ts`
  - `.mts`
  - `.m2ts`
- TS/MTS/M2TS MIME 設為 `video/mp2t`。
- 回放中心 UI 改為顯示「MP4 / TS」。
- 手動選檔也加入 `.ts,.mts,.m2ts`。
- 觀看頁補上 `.mts/.m2ts` MIME 與格式標示。
- 更新 service worker cache name：
  - `shen-yue-assistant-v233-usb-camera-ts`
  - `replay-center-v5-usb-camera-ts`

## APK

- `ShenYueAssistant-1.0.22-usb-camera-ts-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `122`
  - versionName: `1.0.22-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `F10B3BCDB07945F2B67CFC3A353BF6C742B848BF28472EBC7623E8F5055E08DB`

- `ShenYueAssistant-1.0.22-usb-camera-ts-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `122`
  - versionName: `1.0.22-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `834AAC5A73A271815227230F38E5767DB6346B4D85CA1AAA9BAB2AB6D4FCA489`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 皆為 versionCode `122`、targetSdkVersion `28`。
- `aapt2 dump permissions` 確認 built-in 版包含：
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
  - `READ_MEDIA_VIDEO`
  - `MANAGE_EXTERNAL_STORAGE`
- `git diff --check` 無空白錯誤。

## 注意

TS 檔通常可上傳與下載；手機瀏覽器是否能直接播放，取決於影片編碼與瀏覽器支援度。若 QR 觀看頁無法直接播放，仍可使用下載或外部播放器開啟。

