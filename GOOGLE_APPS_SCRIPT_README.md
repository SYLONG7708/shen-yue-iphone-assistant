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

工作表會自動建立 `保固上傳`，欄位採橫向顯示，並自動加大欄寬、列高與換行，避免內容被遮住。
