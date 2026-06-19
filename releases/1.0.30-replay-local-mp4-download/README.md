# Shen Yue Assistant 1.0.30 - Replay Local MP4 Download

## APKs

- `ShenYueAssistant-1.0.30-replay-local-mp4-download-car-legacy-debug.apk`
  - Package: `tw.com.shenyue.assistant`
  - Version: `1.0.30-car-legacy`
  - Version code: `130`
  - SHA256: `3E22EC04E2A935E17B7821B6BFE2585B37ED41FC11048D134ADB83BFEBFE4990`

- `ShenYueAssistant-1.0.30-replay-local-mp4-download-car-legacy-built-in-debug.apk`
  - Package: `tw.com.shenyue.assistant.builtin`
  - Version: `1.0.30-car-legacy-built-in`
  - Version code: `130`
  - SHA256: `C0CC94D1D82EB4E68C932A2FA9E43BA773F1874031E35D2DAB1F9D3D1B494FC5`

## Replay Center Changes

- Local-fast QR now opens a phone watch page instead of a raw video URL.
- The watch page includes video playback, direct playback, MP4 download, and original-file fallback links.
- Downloads use `Content-Disposition: attachment` with UTF-8 filename support.
- TS/MTS/M2TS and MOV sources are remuxed to MP4 for phone playback/download without quality-changing transcoding.
- MP4 sources are served directly for fastest download.

## Verification

- `node --check replay-center\compat-app.js`
- `git diff --check`
- `gradle assembleCarLegacyBuiltInDebug assembleCarLegacyDebug`
- `aapt2 dump badging` confirmed version code `130`, target SDK `28`, and required network/storage permissions.
- APK ZIP inspection confirmed bundled replay center assets include `下載 MP4`, `downloadUrl`, `local-fast`, `replay-center-v13-local-mp4-download`, and `shen-yue-assistant-v241-replay-local-mp4-download`.
