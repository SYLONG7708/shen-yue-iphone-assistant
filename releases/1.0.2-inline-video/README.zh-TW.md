# 1.0.2 Inline Video Player

此資料夾包含本次產出的 Android APK。

## 檔案

- `shen-yue-assistant-1.0.2-github-debug.apk`
  - package：`tw.com.shenyue.assistant`
  - versionCode：`102`
  - versionName：`1.0.2-github`
  - 用途：更新既有 GitHub 線上版 App。

- `shen-yue-assistant-1.0.2-builtin-debug.apk`
  - package：`tw.com.shenyue.assistant.builtin`
  - versionCode：`102`
  - versionName：`1.0.2-built-in`
  - 用途：內建網頁資源版，和 GitHub 版分開安裝。

## 驗證

- Android Gradle build：成功
- `apksigner verify --verbose`：兩個 APK 均通過 v1/v2 簽章驗證
- 前端測試：點擊教學影片後網址不變，頁面內顯示播放器
- 截圖：`desktop-inline-video.png`、`mobile-inline-video.png`
