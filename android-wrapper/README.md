# 申悅車機助手 Android APK 包裝

此資料夾用同一份 PWA 內容產生兩個 APK：

- 目前版本：`1.0.37`（versionCode `137`），新增 USB 自動重掃、檔名日期／自然序號最新優先與新教學智慧分類。

- `builtInDebug`: 內建版，直接讀取 APK 內的 `assets/www/index.html`。
- `githubDebug`: GitHub 版，開啟 `https://sylong7708.github.io/shen-yue-iphone-assistant/`。
- `liveDebug`: 正式雲端版，package 與固定下載 APK 相同，開啟 GitHub Pages；安裝後只要更新 GitHub Pages 就能更新內容，不需要重新安裝 APK。

建置前先把根目錄的 PWA 檔案同步到 `app/src/builtIn/assets/www/`，再執行 Gradle。
