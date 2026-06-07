# Google Apps Script 上傳設定

1. 到 Google 試算表建立或開啟保固資料表。
2. 點選「擴充功能」>「Apps Script」。
3. 把 `Code.gs` 內容貼到 Apps Script。
4. 若 Apps Script 不是從試算表內建立，請把試算表 ID 填入 `SPREADSHEET_ID`。
5. 部署成「網頁應用程式」：
   - 執行身分：我
   - 誰可以存取：任何人
6. 複製 `/exec` 結尾的網址，貼到網頁管理頁的「Google Apps Script 雲端網址」。

目前申悅助手網站固定使用的 Apps Script 部署網址：

```text
https://script.google.com/macros/s/AKfycbxcIrA3syOcg6qCriinVl5KoUt20EnkOIdrW6kXM1OSM5dFZq1qUISkU8Ke8NJQPWuz/exec
```

若 Google 試算表欄位沒有即時變成新版，代表 Apps Script 線上部署仍是舊版；請把本專案 `Code.gs` 完整貼到 Apps Script，按「部署」>「管理部署作業」>「編輯」>「版本」選「新增版本」後重新部署。

工作表會自動建立：

- `保固上傳`：保存保固登錄資料，欄位採橫向顯示，並自動加大欄寬、列高與換行，避免內容被遮住。
- `更新中心上傳`：保存 APK、圖標、圖片、分類、介紹與更新清單 JSON。

若更新中心表格有選擇圖片或 APK 檔案，Apps Script 會自動建立 Google Drive 資料夾 `申悅更新中心上傳` 並保存檔案。更新中心前端會讀取同一個 Apps Script 的 `?type=updates`，例如：

```text
https://script.google.com/macros/s/你的部署ID/exec?type=updates
```

若雲端清單暫時無法讀取，App 會退回內建 `updates.json`。

## 大型 APK 建議

Google Apps Script / Google Drive 表單上傳適合圖片與小型 APK。大型 APK 建議改用本機工具：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\publish-update-app.ps1 -ApkPath "C:\路徑\app.apk" -Name "App 名稱" -PackageName "com.example.app" -VersionCode 100 -VersionName "1.0.0"
```

工具會把 APK 上傳到 `SYLONG7708/update` 的 `apk-cloud` GitHub Release，並更新 `updates.json`。完整教學在 `docs/update-center-upload-guide.html`。
