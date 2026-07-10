# 申悅常青原生設定

`native-config.json` 是 1.0.36 之後的 GitHub 常青原生控制面。車機每次開啟會直接向 GitHub Pages 讀取最新設定；成功驗證後才原子套用並保存為最後有效版本。網路中斷、JSON 不完整、schema 不符或設定超出安全範圍時，APK 會繼續使用最後有效版本或內建保守值，不會把可用設定覆蓋掉。

## 可直接由 GitHub 更新、不必重裝 APK

- USB／MediaStore 是否掃描、可移除磁碟是否全碟掃描。
- 掃描上限、最大深度、固定根目錄、掛載父目錄、USB 名稱及常見資料夾。
- 可辨識影片副檔名、需轉封裝格式、忽略資料夾及來源顯示名稱。
- QR 有效時間、續傳次數、連線／讀取／停滯逾時。
- LINE、Messenger、Facebook、微信或日後其他 Android 套件的分享按鈕、順序及預設開啟目標。
- 所有 HTML、CSS、JavaScript、文案、版面與一般流程。

## 安全界線

- `schema` 與非空白 `revision` 必填；`minimumBridgeVersion` 不得高於 APK 的 bridge version。
- 掃描絕對路徑只允許外部儲存、USB／mount 及既有 360 目錄，不允許 `..` 或任意系統路徑。
- 掃描筆數、深度、逾時、分享目標數量及字串長度都有硬上限。
- 分享 package name 必須符合 Android 套件名稱格式。
- 設定驗證失敗時保留 last-known-good，不會部分套用。
- 原生 JavaScript 橋接使用每次 Activity 隨機產生的 256-bit 工作階段權杖；權杖放在 URL fragment，不會送到 GitHub 或 Referer。

## 仍需新 APK 的唯一類型

Android Manifest 新權限、全新 Java／Kotlin 原生 API、新系統 Activity／Service／Provider，或 Android 平台本身要求的簽章與 SDK 變更，無法由網頁新增，仍需發 APK。1.0.36 已預先包含目前回放所需的 USB1／USB2／USB3 掃描、100% 完整接收、Range 續傳、原生檔案分享及遠端設定基礎。

## 發布檢查

1. 修改 `native-config.json` 並提高 `revision`、更新 `updatedAt`。
2. 確認 JSON 可解析，且 `schema`／`minimumBridgeVersion` 相容。
3. 推送 GitHub，等待 Pages 部署成功。
4. 重新開啟回放中心，確認右上角「Android 常青雲端核心」顯示新 revision。
5. 若新規則涉及掃描，至少以一個只受新規則影響的測試檔驗證，完成後清除測試檔。
