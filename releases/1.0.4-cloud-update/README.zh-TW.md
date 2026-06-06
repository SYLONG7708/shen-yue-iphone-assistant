# 申悅車機助手 1.0.4 雲端更新版 APK

這版 APK 載入 GitHub Pages 線上網頁：

```text
https://sylong7708.github.io/shen-yue-iphone-assistant/
```

之後只要修改 GitHub Pages、Apps Script 或雲端 JSON 資料，使用者重新開啟 App 或重新整理後就會讀取新資料，不需要重新安裝 APK。

## APK

- `shen-yue-assistant-1.0.4-cloud-update-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - App 名稱：`申悅車機助手 雲端版`
  - 版本：`1.0.4-cloud`
  - versionCode：`104`
  - 可覆蓋更新原本安裝的 GitHub 版 App。

## 驗證

- Gradle：`:app:assembleGithubDebug` 成功。
- `aapt dump badging`：套件名 `tw.com.shenyue.assistant`，versionCode `104`。
- `apksigner verify --verbose`：通過 v1/v2 簽章驗證。

## SHA-256

```text
shen-yue-assistant-1.0.4-cloud-update-debug.apk
F6BC2A20D7C6F6F17E3BA76F665AEC605BF3A1264562ECAB521D823573E294AA
```
