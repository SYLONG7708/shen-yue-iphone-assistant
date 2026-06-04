# 申悅車機助手

## 本次版本

- 版本：1.0.2
- 重點：教學頁影片改為站內播放，不再跳轉外部網頁。
- 支援：YouTube、YouTube 播放清單、Vimeo、mp4、webm、m3u8 等影片來源。

## APK

建置輸出位於：

```text
releases/1.0.2-inline-video/
```

- `shen-yue-assistant-1.0.2-github-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - 會載入 GitHub Pages 線上網頁。
  - 適合更新原本安裝的 GitHub 版 App。

- `shen-yue-assistant-1.0.2-builtin-debug.apk`
  - 套件名：`tw.com.shenyue.assistant.builtin`
  - 內建網頁與圖片資源。
  - 會和 GitHub 版分開安裝。

## 本機建置

```powershell
$env:ANDROID_HOME='C:\Users\Administrator\Android\Sdk'
$env:ANDROID_SDK_ROOT='C:\Users\Administrator\Android\Sdk'
C:\Users\Administrator\shen-yue-iphone-assistant\.tools\gradle-9.1.0\bin\gradle.bat --no-daemon :app:assembleGithubDebug :app:assembleBuiltInDebug
```

