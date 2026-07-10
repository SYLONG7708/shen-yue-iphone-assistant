# 申悅車機助手 1.0.36：常青雲端原生核心頂配版

## 這次安裝的正式版本

建議且已準備安裝到 7870 的檔案：

`ShenYueAssistant-1.0.36-evergreen-cloud-native-core-car-legacy-cloud-release-debug-signed.apk`

- 套件：`tw.com.shenyue.assistant`
- 版本：`1.0.36-car-legacy-cloud`（versionCode `136`）
- Android：最低 SDK 23、target SDK 28
- 大小：2,606,473 bytes
- SHA-256：`DC2965BD243087DC881538F9AC95CB7C79ABFC5E83E16AC96640495291C7CC81`
- 簽章：沿用目前車機已安裝版本的 Android debug key，因此可直接覆蓋更新而不清除資料。

另附：

- `ShenYueAssistant-1.0.36-evergreen-cloud-native-core-car-legacy-cloud-debug.apk`
  - 2,980,210 bytes
  - SHA-256：`D24689CA8F9EFE5DF4412DBD1DFABC5B0789028638D5AE181D5DE88B87F65B11`

日常只需安裝建議的 cloud 正式檔；APK 本身已具備編譯內建安全預設與 last-known-good 離線備援，不需另外安裝第二套 App。

## 1.0.36 頂配改善

- 新增常青原生橋接 v2 與 `replay-center/native-config.json`。往後介面、掃描路徑、磁碟名稱、格式、上限、逾時、續傳次數與分享 App 可直接由 GitHub 更新。
- 遠端設定先完整驗證、再一次套用；GitHub 暫時離線或設定錯誤時，自動使用最後有效設定或 APK 內建值。
- USB1／USB2／USB3、StorageManager、外接目錄、mount table 與 MediaStore 會共同掃描；可移除磁碟全碟不限深度，最多 100,000 部影片。
- 支援 28 種常見影片／環景格式，包括 MP4、M4V、MOV、TS／MTS／M2TS、AVI、MKV、WebM、3GP、DAV、H264／H265、HEVC、INSV、LRV、VOB、MPG／MPEG、WMV、FLV 及 OGV。
- 使用檔案系統 device＋inode 去重，同一支 USB 經 `/USB3`、`/usb3`、`/Usb3` 或 MediaStore 看到時只列一次；不同檔案不會因檔名／大小相同被誤刪。
- Android 接收端保留 `.part` 並跨 Activity 續傳；完成檔可安全重用，下載時保持螢幕喚醒，完整大小不符絕不顯示 100%。
- 只有「下載完成 100%｜完整性驗證通過」後才開啟分享；Android `ACTION_SEND` 傳送 `content://` 完整影片，LINE 收到影片檔案而非網址。
- 分享目標由 GitHub 設定，直接嘗試指定 package；未安裝時自動回到系統分享，不受日後 Manifest package query 限制。
- 分享 Provider 對外顯示真正影片檔名，不暴露續傳快取前綴。
- WebView 僅信任指定 GitHub Pages 路徑，關閉網頁偵錯、混合內容、雲端 file URL 存取及跨 file 存取。
- 原生橋接使用每次啟動隨機 256-bit 權杖；權杖只放 URL fragment，不會送到 GitHub 或 Referer。
- Service Worker 對動態設定與 APK 啟動時間戳使用固定快取鍵，避免長期累積垃圾快取。

## 往後是否還要安裝 APK

一般功能與回放規則往後只更新 GitHub 即可，車機重新開啟頁面就會套用，不必再安裝 APK。唯一平台例外是未來若必須新增 Android Manifest 權限、全新 Java／Kotlin 原生 API、新 Activity／Service／Provider，或 Android 平台要求的簽章／SDK 變更，這些無法由網頁新增，才需要新 APK。

## 實機與完整性驗證

- 7870（Android 13、`uis7870sc_2h10_nosec`）安裝 1.0.36 測試版成功，常青核心顯示 revision `2026-07-10-evergreen-1.0.36`。
- 10 層深的 `evergreen-remote-test.insv` 成功找到，來源標示 USB3。
- 同一測試檔經 USB3 大小寫掛載別名只列一次。
- 9,185,939-byte MP4 同時由 USB 實體路徑與 MediaStore 可見，清單仍只列一次。
- Android 原生接收顯示 100% 後才出現分享按鈕與 chooser；chooser 預覽的是 MP4 檔名，不是網址。
- 7870 拉回的完整影片為 9,185,939 bytes，SHA-256 與來源同為 `41D1D76AF3980427B020F69823AAEB84C0EB2C52ACC67AD61AAF91FFD2A34DEC`。
- Chrome 通用瀏覽器流程亦下載 9,185,939 bytes，顯示 100%，檔名與同一 SHA-256 均正確。
- JavaScript、JSON、`git diff --check`、Java 編譯、cloud debug／release、offline built-in、lint vital、zipalign、APK v1／v2／v3 簽章及 `aapt2` 版本資料均通過。
