# 1.0.21 USB Mount DCIM CAMERA MP4

本版依 `C:\Users\Long\Desktop\7870` 刷機包調整回放中心 USB 掃描。

`lsec_updatesh/lsecsh.bin` 顯示此車機常用外部來源包含：

- `/storage/sdcard1`
- `/storage/usb_storage`
- `/mnt/media_rw/usb_storage`

因此 1.0.21 不再只依賴 `/storage/USB1` 或 `/storage/USB2`，而是固定找各種 USB 掛載點下的 `DCIM/CAMERA`。

## 掃描目標

仍只讀取 USB 影片位置：

- `DCIM/CAMERA/*.mp4`

新增相容掛載：

- `/storage/sdcard1/DCIM/CAMERA`
- `/storage/sdcard2/DCIM/CAMERA`
- `/storage/usb_storage/DCIM/CAMERA`
- `/mnt/media_rw/usb_storage/DCIM/CAMERA`
- `/mnt/usb_storage/DCIM/CAMERA`
- `/mnt/usbhost/DCIM/CAMERA`
- `/storage/udisk/DCIM/CAMERA`
- `/storage/udisk1/DCIM/CAMERA`
- `/storage/usbotg/DCIM/CAMERA`
- `/storage/USB1/DCIM/CAMERA`
- `/storage/USB2/DCIM/CAMERA`
- `/mnt/media_rw/USB1/DCIM/CAMERA`
- `/mnt/media_rw/USB2/DCIM/CAMERA`

也會自動偵測 `/storage`、`/mnt/media_rw`、`/storage/usb_storage`、`/mnt/usb_storage`、`/mnt/usbhost` 底下的子資料夾，例如 UUID 或 `USB_DISK0` 類掛載。

## UI 改善

- 回放中心按鈕改為「掃描 USB/DCIM」。
- 掃描中會提示正在讀取 USB 掛載點的 `DCIM/CAMERA` MP4。
- 若找不到影片，畫面會列出已找到且可讀取的 `DCIM/CAMERA` 掃描路徑，方便回報下一步排查。

## APK

- `ShenYueAssistant-1.0.21-usb-mount-camera-car-legacy-built-in-debug.apk`
  - package: `tw.com.shenyue.assistant.builtin`
  - versionCode: `121`
  - versionName: `1.0.21-car-legacy-built-in`
  - targetSdkVersion: `28`
  - SHA256: `BA93E01D204A4568D06DF774F518E60AE001B7035ECE7E16B0E5007B07087E2D`

- `ShenYueAssistant-1.0.21-usb-mount-camera-car-legacy-debug.apk`
  - package: `tw.com.shenyue.assistant`
  - versionCode: `121`
  - versionName: `1.0.21-car-legacy`
  - targetSdkVersion: `28`
  - SHA256: `83D8A08B8FA869EBB75049BF25DF9696D79AE1A5C1CB6B94A62F96B04601B986`

## 驗證

- `node --check replay-center/compat-app.js` 成功。
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug` 成功。
- `aapt2 dump badging` 確認兩個 APK 皆為 versionCode `121`、targetSdkVersion `28`。
- `aapt2 dump permissions` 確認 built-in 版包含：
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
  - `READ_MEDIA_VIDEO`
  - `MANAGE_EXTERNAL_STORAGE`

## 測試方式

1. USB 隨身碟建立 `DCIM\CAMERA`。
2. 放入 `.mp4`。
3. 插入車機 USB。
4. 開啟回放中心，按「掃描 USB/DCIM」。
5. 若仍沒有影片，請拍下或回報畫面中的「已檢查」路徑。

