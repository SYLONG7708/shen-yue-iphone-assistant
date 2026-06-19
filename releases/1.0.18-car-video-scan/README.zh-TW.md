# 申悅車機助手 1.0.18 - 車機影片掃描修正

## 這版處理的問題

- 車載 Android 開啟回放中心選 MP4 時，系統檔案選擇器沒有可選影片或沒有選項。
- 車機韌體可能缺少完整 DocumentsUI / 檔案管理器，或 360 環景影片不在標準媒體選擇器可見範圍。

## 修正內容

- WebView 檔案選擇器改成車機相容模式，提供 `video/*`、`*/*`、`ACTION_OPEN_DOCUMENT` 與 `ACTION_GET_CONTENT` 備援。
- 新增 Android 原生影片橋接：
  - 讀取影片權限狀態
  - 請求影片讀取 / 所有檔案存取
  - 從 MediaStore 與常見車機資料夾掃描影片
  - 不依賴網頁 file input，直接由 Android 串流上傳本機影片
- 回放中心新增「掃描車機影片」與「允許讀取影片」入口。
- service worker cache 更新，避免 WebView/GitHub Pages 使用舊版 `compat-app.js`。

## APK

- `ShenYueAssistant-1.0.18-live-car-video-scan-debug.apk`
  - 載入 GitHub Pages 雲端頁面。
  - 適合雲端頁面已同步後使用。
- `ShenYueAssistant-1.0.18-built-in-car-video-scan-debug.apk`
  - 內建本次回放中心頁面。
  - 適合直接裝到車機測試，不依賴 GitHub Pages 是否已更新。

## 車機測試順序

1. 先安裝 built-in APK。
2. 打開「回放中心」。
3. 先測「選擇 MP4 / MOV / MKV 影片」是否能看到影片。
4. 若仍看不到，按「允許讀取影片」授權。
5. 回到回放中心按「掃描車機影片」。
6. 選到影片後按「上傳並產生 QR」。

## 韌體線索

`C:\Users\Long\Desktop\7870\config.txt` 顯示車機啟用 `persist.syu.camera360 = 5` 與 `persist.syu.showsixcamera=true`。
`lsec6318update` 字串中可見 `/aw3603D`、`/360res/aw3603D`、`/data/media/0/`，因此環景檔案可能在一般檔案選擇器不一定會顯示的 360 / aw3603D 相關資料夾。
