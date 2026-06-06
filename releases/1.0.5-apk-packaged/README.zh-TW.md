# 申悅車機助手 1.0.5 APK版

這版是 APK 內建內容版，不載入 GitHub Pages 網址。

## APK

- `shen-yue-assistant-1.0.5-apk-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - App 名稱：`申悅車機助手 APK版`
  - 版本：`1.0.5-apk`
  - versionCode：`105`
  - 啟動位置：`file:///android_asset/www/index.html`
  - 可覆蓋更新原本安裝的雲端版 App。

## 驗證

- Gradle：`:app:assembleApkDebug` 成功。
- `aapt dump badging`：套件名 `tw.com.shenyue.assistant`，versionCode `105`。
- `aapt list`：APK 內含 `assets/www/index.html`、`assets/www/app.js`、`assets/www/styles.css`。
- `apksigner verify --verbose`：通過 v1/v2 簽章驗證。

## SHA-256

```text
shen-yue-assistant-1.0.5-apk-debug.apk
344437CB1438ED6454E47CB06EAEC3770C26C228101245414EB252BB2DEF3AAF
```
