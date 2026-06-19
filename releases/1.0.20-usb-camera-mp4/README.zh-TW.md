# 1.0.20 USB1/USB2 DCIM CAMERA MP4

本版針對車機回放中心固定讀取 USB 影片位置：

- USB1: `DCIM/CAMERA`
- USB2: `DCIM/CAMERA`

Android 實際掃描的常見掛載路徑包含：

- `/storage/USB1/DCIM/CAMERA`
- `/storage/USB2/DCIM/CAMERA`
- `/mnt/media_rw/USB1/DCIM/CAMERA`
- `/mnt/media_rw/USB2/DCIM/CAMERA`
- `/storage/usb_storage/USB1/DCIM/CAMERA`
- `/storage/usb_storage/USB2/DCIM/CAMERA`

## APK

- `ShenYueAssistant-1.0.20-usb-camera-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `120`
  - versionName: `1.0.20-car-legacy-built-in`
  - targetSdkVersion: `28`
  - 用於對應使用者提供的 built-in 版 package。

- `ShenYueAssistant-1.0.20-usb-camera-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `120`
  - versionName: `1.0.20-car-legacy`
  - targetSdkVersion: `28`
  - 用於 base package 備用安裝。

## 修改重點

- 回放中心 Android 原生掃描只列出 USB1/USB2 `DCIM/CAMERA` 內的 `.mp4`。
- 避免再掃描 Download、Movies、360res、aw3603D 等非指定位置。
- 掃描清單顯示來源為 `USB1/DCIM/CAMERA` 或 `USB2/DCIM/CAMERA`。
- 選到 USB MP4 後仍使用原生串流上傳至回放中心 API，並產生一次性 QR。
- 新增 `carLegacyBuiltIn` flavor，保留 `.builtin` package，同時使用 targetSdk 28 的舊式儲存相容模式。
- 更新回放中心 UI 提示與 service worker cache name，避免 WebView 讀到舊頁面。

## 安裝注意

使用者提供的 `17817968476a340fefa3a6e.apk` 是：

- package: `tw.com.shenyue.assistant.builtin`
- versionCode: `118`
- versionName: `1.0.18-built-in`

但該 APK 簽章與目前本機 debug keystore 不同，因此新版 `.builtin` APK 可能無法直接覆蓋安裝。若車機出現簽章不一致，需先卸載舊 `tw.com.shenyue.assistant.builtin`，再安裝新版。

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 皆為 versionCode `120`、targetSdkVersion `28`。
- `aapt2 dump permissions` 確認 built-in 版包含：
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
  - `READ_MEDIA_VIDEO`
  - `MANAGE_EXTERNAL_STORAGE`
- 使用者提供的測試影片可由 `ffprobe` 讀取：
  - `803536910.873810.mp4`: 約 7.54 秒
  - `803536910.819283.mp4`: 約 10.98 秒

測試時請把 MP4 放到 USB 隨身碟的 `DCIM/CAMERA`，插到車機後在回放中心按「掃描 USB1/USB2」。
