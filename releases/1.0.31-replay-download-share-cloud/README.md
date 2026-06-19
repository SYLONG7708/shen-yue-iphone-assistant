# Shen Yue Assistant 1.0.31 - Replay Download/Share Cloud

## APKs

- `ShenYueAssistant-1.0.31-replay-download-share-cloud-car-legacy-cloud-release-debug-signed.apk`
  - Package: `tw.com.shenyue.assistant`
  - Version: `1.0.31-car-legacy-cloud`
  - Version code: `131`
  - Target SDK: `28`
  - Build type: release build, signed with the Android debug key because no production keystore exists in this workspace
  - Home URL: `https://sylong7708.github.io/shen-yue-iphone-assistant/`
  - SHA256: `77AB13DB8261D1FB1C34E7E1FA522EF3A6FACEB1B0E8DEC00B3540E53E3A93AF`

- `ShenYueAssistant-1.0.31-replay-download-share-cloud-car-legacy-cloud-debug.apk`
  - Package: `tw.com.shenyue.assistant`
  - Version: `1.0.31-car-legacy-cloud`
  - Version code: `131`
  - Target SDK: `28`
  - Home URL: `https://sylong7708.github.io/shen-yue-iphone-assistant/`
  - SHA256: `1E40CBD59BD9B88A1EDE6AF7D80E6E31E72628A8C0421D4E0CED6BA9A18E53DA`

- `ShenYueAssistant-1.0.31-replay-download-share-cloud-car-legacy-cloud-built-in-debug.apk`
  - Package: `tw.com.shenyue.assistant.builtin`
  - Version: `1.0.31-car-legacy-cloud-built-in`
  - Version code: `131`
  - Target SDK: `28`
  - Home URL: `https://sylong7708.github.io/shen-yue-iphone-assistant/`
  - SHA256: `7F2B501ECCCF4852E336A9B79DB075276C2B871DD9765BB4347A2304697CD352`

## Changes

- Replay local-fast QR now points to the cloud `replay-center/watch/` page.
- The phone/iPhone watch page no longer displays or loads a video player.
- The phone page only shows MP4 download, system share, LINE, and copy-link actions.
- The local fallback page served by the Android APK also removes playback and shows download/share actions only.
- The main car legacy cloud APK loads GitHub Pages, so future frontend text/layout changes can be updated from the cloud without rebuilding the APK.
- `updates.json` now points `tw.com.shenyue.assistant` to the 1.0.31 cloud APK under this repo release folder.
- The update-center APK URL points to the installable release-debug-signed package.

## Verification

- `node --check replay-center\compat-app.js`
- Inline script parse check for `replay-center\watch\index.html`
- `git diff --check`
- `gradle assembleCarLegacyCloudDebug assembleCarLegacyCloudBuiltInDebug`
- `gradle assembleCarLegacyCloudRelease`
- `apksigner verify --verbose` confirmed the release-debug-signed APK verifies with v1/v2/v3 signatures.
- `aapt2 dump badging` confirmed package names, version code `131`, version names, target SDK `28`, and required permissions.
- Generated `BuildConfig.java` confirmed both cloud variants use the GitHub Pages `HOME_URL`.
