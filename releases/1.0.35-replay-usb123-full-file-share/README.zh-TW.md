# 申悅車機助手 1.0.35：USB1／USB2／USB3 完整回放與影片檔案分享

## 建議安裝檔

`ShenYueAssistant-1.0.35-replay-usb123-full-file-share-car-legacy-cloud-release-debug-signed.apk`

- 套件：`tw.com.shenyue.assistant`
- 版本：`1.0.35-car-legacy-cloud`（versionCode `135`）
- Android：最低 SDK 23、target SDK 28
- 大小：2,598,281 bytes
- SHA-256：`D5ED1393EC4D899921637190CAFD2825257E4F8B4DD6545293F5435063BEF2CC`
- 因工作區沒有正式 production keystore，本 release 組建沿用既有 Android debug key 簽署。

另附雲端 debug APK 與 `.builtin` 備援 APK：

- `ShenYueAssistant-1.0.35-replay-usb123-full-file-share-car-legacy-cloud-debug.apk`
  - 3,033,592 bytes
  - SHA-256：`E13558963B5FD7E3E83F30C0AA9DABE62A6DA4968F8AECE20B1DDC7CF0EB8728`
- `ShenYueAssistant-1.0.35-replay-usb123-full-file-share-car-legacy-cloud-built-in-debug.apk`
  - 2,968,066 bytes
  - SHA-256：`453CAA73282DC9A019357D7DBC85FB0A477C96B0B6FD4CC9241A6962C763B620`

## 改善內容

- 同時執行實體資料夾掃描與 Android MediaStore 查詢，不再互斥漏檔。
- 加入 USB3、`sdcard3`、`udisk2`、`USB_DISK2`、`Storage03`，並動態探索 StorageManager、外接磁碟與 mount table。
- 可移除磁碟從根目錄完整遞迴，移除原本七層限制；上限由 5,000 提升至 100,000 部影片。
- 支援 MP4、TS／MTS／M2TS、MOV、AVI、MKV、WebM、3GP、DAV、H264／H265 等環景常見格式。
- 清單依最新時間排序，提供 USB1／USB2／USB3 篩選、搜尋與分頁渲染，避免大量影片拖慢畫面。
- 手機下載支援 Range 自動續傳；收到的位元數及產生的檔案大小完全相符後，才顯示 100%。
- QR 由 APK 本機產生，不依賴外部 QR 服務；Android 原生完整檔案 QR 置頂。
- 同一 APK 加入手機接收模式：掃描原生 QR 後下載、驗證、儲存完整影片，再用 Android `ACTION_SEND` 把影片 `content://` 檔案傳給 LINE、Messenger、微信或其他 App。
- 通用瀏覽器下載頁保留；不支援檔案分享的瀏覽器會明確提示，絕不再把網址當成影片傳送。

## 使用方式

1. 車機安裝建議 APK，進入「回放中心」，允許影片／儲存權限後按「掃描 USB1／USB2／USB3」。
2. Android 手機也安裝同一個建議 APK，並與車機連在同一個 Wi-Fi 或熱點。
3. 車機選取影片後，手機掃描置頂的「Android 完整影片分享到 LINE」QR。
4. 手機顯示 100% 與「完整性驗證通過」後，才會開啟 LINE 或系統檔案分享。
5. iPhone 或未安裝 App 的手機可掃第二個通用 QR；影片會在完整驗證後才出現儲存動作。

## 驗證

- JavaScript 及兩個回放下載頁 inline script 語法檢查通過。
- `git diff --check` 通過。
- Gradle unit-test task（無測試來源）、cloud debug、cloud release、legacy debug、cloud built-in debug 全部建置成功。
- `zipalign -c -v 4` 通過。
- `apksigner verify --verbose` 通過 v1／v2／v3 簽章驗證。
- `aapt2 dump badging` 確認套件、版本碼 135、版本名稱及 target SDK 28。
- Android 模擬器以最終已簽署 APK 接收 9,185,939-byte MP4；下載檔與來源 SHA-256 同為 `41D1D76AF3980427B020F69823AAEB84C0EB2C52ACC67AD61AAF91FFD2A34DEC`。
- 原生分享面板在驗證完成後顯示 `Sharing 1 file` 與影片檔名，不是網址。
- Android Chrome 測試確認先顯示「下載完成 100%｜完整性驗證通過」，之後才出現檔案儲存視窗。
