# 申悅車機助手 1.0.19 - 車機舊式儲存相容版

## 用途

1.0.18 built-in 在車機仍無法選 MP4 時，改測這個版本。
此版本把 Android target SDK 降為 28，並啟用舊式外部儲存權限，讓部分 A13 FYT/7870 車機可以避開 scoped storage 與不完整檔案選擇器限制。

## APK

- `ShenYueAssistant-1.0.19-car-legacy-storage-debug.apk`
- package: `tw.com.shenyue.assistant`
- versionCode: `119`
- versionName: `1.0.19-car-legacy`
- targetSdkVersion: `28`
- SHA256: `A2EB651B48F325F735782FDF289CC4AA879A5EE9C753EB170F1C4F0EDD12DA55`

## 與 1.0.18 差異

- 保留 1.0.18 的回放中心與 Android 原生掃描橋接。
- 新增 `READ_EXTERNAL_STORAGE`、`WRITE_EXTERNAL_STORAGE` 舊式權限。
- `requestLegacyExternalStorage=true`。
- 掃描影片時，target SDK 28 且有讀取權限就會嘗試 raw folder scan，不只依賴 MediaStore。

## 車機測試

1. 覆蓋安裝本 APK。
2. 開啟回放中心。
3. 按「允許讀取影片」，授權儲存空間。
4. 回到回放中心，按「掃描車機影片」。
5. 若找到影片，選取後上傳並產生 QR。
6. 若仍找不到，代表環景檔案可能在受保護 app 私有資料夾或 vendor 專用分區，需要 root/system app/USB 匯出/直接修改韌體方案。
