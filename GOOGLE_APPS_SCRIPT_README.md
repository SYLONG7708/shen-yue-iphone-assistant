# Google Apps Script 上傳設定

1. 到 Google 試算表建立或開啟保固資料表。
2. 點選「擴充功能」>「Apps Script」。
3. 把 `Code.gs` 內容貼到 Apps Script。
4. 若 Apps Script 不是從試算表內建立，請把試算表 ID 填入 `SPREADSHEET_ID`。
5. 部署成「網頁應用程式」：
   - 執行身分：我
   - 誰可以存取：任何人
6. 複製 `/exec` 結尾的網址，貼到網頁管理頁的「Google Apps Script 雲端網址」。

工作表會自動建立 `保固上傳`，欄位採橫向顯示，並自動加大欄寬、列高與換行，避免內容被遮住。
