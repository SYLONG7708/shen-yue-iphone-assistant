# 申悅車機助手 1.0.6 即時更新版 APK

這版是使用者需要的版本：APK 安裝一次，之後 GitHub 更新完成後，車機 App 重新開啟會直接抓最新內容，不需要重新安裝 APK。

## APK

- `shen-yue-assistant-1.0.6-live-update-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - App 名稱：`申悅車機助手 即時更新版`
  - 版本：`1.0.6-live`
  - versionCode：`106`
  - 載入來源：`https://sylong7708.github.io/shen-yue-iphone-assistant/`
  - 可覆蓋更新原本安裝的雲端版或 APK 版 App。

## 即時更新機制

- 每次開啟 App 都會在 GitHub Pages URL 加上時間戳，避免車機讀到舊快取。
- WebView 設定為 `LOAD_NO_CACHE`。
- 回到 App 時會重新載入首頁。
- 載入後會解除 service worker 並清除 CacheStorage，避免 PWA 快取保留舊畫面。

## 驗證

- Gradle：`:app:assembleLiveDebug` 成功。
- `aapt dump badging`：套件名 `tw.com.shenyue.assistant`，versionCode `106`。
- `BuildConfig.HOME_URL`：`https://sylong7708.github.io/shen-yue-iphone-assistant/`。
- `apksigner verify --verbose`：通過 v1/v2 簽章驗證。

## SHA-256

```text
shen-yue-assistant-1.0.6-live-update-debug.apk
CECEDA7D59878DC12667D5D69D825BCE129FFCF4B2965EBEAE29CF57F9429872
```

## 注意

GitHub Pages 本身仍需要完成部署。部署完成後，這個 APK 不會再等車機快取，也不需要重新安裝。
