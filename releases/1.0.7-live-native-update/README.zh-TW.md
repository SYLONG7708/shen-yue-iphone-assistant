# 申悅車機助手 1.0.7 即時更新原生下載版

## APK

- 檔名：`shen-yue-assistant-1.0.7-live-native-update-debug.apk`
- 套件名：`tw.com.shenyue.assistant`
- App 名稱：`申悅車機助手 即時更新版`
- 版本：`1.0.7-live`
- versionCode：`107`
- SHA-256：`42FE2770C80D1A6E93C2527B33BB620FFC01A614B94857407A4D3942FF2970F4`

## 修正內容

- 補回 APK 內的 `window.ShenYueUpdater` Android 原生介面。
- 更新中心會進入 Android APK 下載/安裝模式，不再只顯示瀏覽器模式。
- 下載 APK 時支援 GitHub 重新導向，並可依更新資料中的 SHA-256 驗證檔案。
- 安裝時會開啟 Android 安裝確認畫面。
- 已固定 Java 編譯編碼為 UTF-8，避免 Windows 編譯環境造成中文訊息亂碼。

## 雲端網址

- 固定最新版 APK：
  `https://github.com/SYLONG7708/shen-yue-iphone-assistant/releases/download/assistant-apk/shen-yue-assistant.apk`
- 此版本 APK：
  `https://github.com/SYLONG7708/shen-yue-iphone-assistant/releases/download/assistant-apk/shen-yue-assistant-1.0.7-live-native-update-debug.apk`

## 驗證

- Gradle：`:app:clean :app:assembleLiveDebug` 成功。
- aapt：package `tw.com.shenyue.assistant`，versionName `1.0.7-live`，versionCode `107`。
- apksigner：v1/v2 簽章驗證通過。
