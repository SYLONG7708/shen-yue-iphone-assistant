# 申悅車機助手 1.0.3 APK

本版重點：

- 更新中心新增、修改與儲存需要管理 PIN。
- 頁面不顯示預設密碼提示。
- 修改 APK 名稱、圖標與圖片會儲存在本機正式清單，暫不送雲端。

## APK

- `shen-yue-assistant-1.0.3-builtin-debug.apk`
  - 套件名：`tw.com.shenyue.assistant.builtin`
  - 版本：`1.0.3-built-in` / versionCode `103`
  - 內建網頁與圖片資源，最適合直接安裝測試新版功能。

- `shen-yue-assistant-1.0.3-github-debug.apk`
  - 套件名：`tw.com.shenyue.assistant`
  - 版本：`1.0.3-github` / versionCode `103`
  - 會載入 GitHub Pages 線上網頁。

## 驗證

- Gradle：`:app:assembleGithubDebug :app:assembleBuiltInDebug` 成功。
- `aapt dump badging`：兩個 APK 均為 versionCode `103`。
- `apksigner verify --verbose`：兩個 APK 均通過 v1/v2 簽章驗證。

## SHA-256

```text
shen-yue-assistant-1.0.3-builtin-debug.apk
26191E29B33A9996FB6D2FE5A3F62F6A4D6E3816CC7526A584FA38DE64391CC8

shen-yue-assistant-1.0.3-github-debug.apk
26D13F03D324728ABDB4447CD6AF2ADADE63180D3D8252A3DFD3BE3B67EE5BD1
```
