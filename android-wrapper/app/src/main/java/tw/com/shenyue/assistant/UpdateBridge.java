package tw.com.shenyue.assistant;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.provider.OpenableColumns;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.google.zxing.common.BitMatrix;

import java.io.ByteArrayOutputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.BufferedReader;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UpdateBridge {
    static final String PREFS_NAME = "shen_yue_update_center";
    static final String LAST_INSTALL_STATUS = "last_install_status";
    static final String ACTION_INSTALL_COMMIT = "tw.com.shenyue.assistant.INSTALL_COMMIT";
    private static final int VIDEO_PERMISSION_REQUEST_CODE = 7710;
    private static final int LOCAL_VIDEO_SCAN_LIMIT = 100000;
    private static final int FAST_UPLOAD_BUFFER_SIZE = 256 * 1024;
    private static final long UPLOAD_PROGRESS_INTERVAL_MS = 180L;
    private static final long LOCAL_SHARE_TTL_MS = 6L * 60L * 60L * 1000L;
    private static final String[] VIDEO_EXTENSIONS = {
            ".mp4", ".m4v", ".mov", ".ts", ".mts", ".m2ts",
            ".avi", ".mkv", ".webm", ".3gp", ".3g2",
            ".dav", ".264", ".h264", ".hevc", ".h265"
    };
    private static final String CLOUD_HOME_URL = "https://sylong7708.github.io/shen-yue-iphone-assistant/";

    private final Activity activity;
    private final PackageManager packageManager;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ExecutorService localVideoExecutor = Executors.newCachedThreadPool();
    private final ConcurrentHashMap<String, UpdateTask> tasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, LocalVideoScanTask> videoScanTasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, VideoPrepareTask> videoPrepareTasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, VideoUploadTask> videoUploadTasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, LocalVideoShare> localVideoShares = new ConcurrentHashMap<>();
    private final Object localVideoServerLock = new Object();
    private volatile ServerSocket localVideoServer;
    private volatile Thread localVideoServerThread;
    private volatile Uri lastSelectedFileUri;

    UpdateBridge(Activity activity) {
        this.activity = activity;
        this.packageManager = activity.getPackageManager();
    }

    void setLastSelectedFileUri(Uri uri) {
        lastSelectedFileUri = uri;
    }

    @JavascriptInterface
    public String shareText(String title, String text, String url) {
        JSONObject result = new JSONObject();
        try {
            String safeTitle = title == null || title.trim().length() == 0 ? "回放中心影片" : title.trim();
            String safeText = text == null ? "" : text.trim();
            String safeUrl = url == null ? "" : url.trim();
            String shareBody = safeText.length() > 0 ? safeText : safeUrl;
            if (safeUrl.length() > 0 && !shareBody.contains(safeUrl)) {
                shareBody = shareBody.length() > 0 ? shareBody + "\n" + safeUrl : safeUrl;
            }
            if (shareBody.length() == 0) {
                result.put("ok", false);
                result.put("message", "沒有可分享的連結。");
                return result.toString();
            }

            final String finalTitle = safeTitle;
            final String finalBody = shareBody;
            activity.runOnUiThread(() -> {
                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType("text/plain");
                sendIntent.putExtra(Intent.EXTRA_SUBJECT, finalTitle);
                sendIntent.putExtra(Intent.EXTRA_TEXT, finalBody);
                Intent chooser = Intent.createChooser(sendIntent, "分享回放影片");
                try {
                    activity.startActivity(chooser);
                } catch (ActivityNotFoundException error) {
                    Toast.makeText(activity, "找不到可分享的通訊 APP。", Toast.LENGTH_LONG).show();
                }
            });

            result.put("ok", true);
            return result.toString();
        } catch (Exception error) {
            putError(result, error);
            return result.toString();
        }
    }

    @JavascriptInterface
    public String getDeviceState() {
        JSONObject result = new JSONObject();
        try {
            PackageInfo self = packageManager.getPackageInfo(activity.getPackageName(), 0);
            result.put("ok", true);
            result.put("packageName", activity.getPackageName());
            result.put("versionName", self.versionName);
            result.put("versionCode", getVersionCode(self));
            result.put("canRequestPackageInstalls", canRequestPackageInstalls());
            result.put("lastInstallStatus", getPrefs().getString(LAST_INSTALL_STATUS, ""));
        } catch (Exception error) {
            putError(result, error);
        }
        return result.toString();
    }

    @JavascriptInterface
    public String getBundledManifest() {
        try (InputStream input = activity.getAssets().open("www/updates.json");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toString("UTF-8");
        } catch (Exception error) {
            JSONObject result = new JSONObject();
            try {
                result.put("schema", 1);
                result.put("channel", "embedded");
                result.put("updatedAt", "");
                result.put("apps", new JSONArray());
                result.put("error", error.getMessage() == null ? error.toString() : error.getMessage());
            } catch (JSONException ignored) {
                // JSON error while reporting another error.
            }
            return result.toString();
        }
    }

    @JavascriptInterface
    public String getInstalledInfo(String packageName) {
        JSONObject result = new JSONObject();
        try {
            result.put("ok", true);
            result.put("packageName", packageName);
            PackageInfo info = packageManager.getPackageInfo(packageName, 0);
            result.put("installed", true);
            result.put("versionName", info.versionName == null ? "" : info.versionName);
            result.put("versionCode", getVersionCode(info));
        } catch (PackageManager.NameNotFoundException missing) {
            try {
                result.put("ok", true);
                result.put("packageName", packageName);
                result.put("installed", false);
                result.put("versionName", "");
                result.put("versionCode", 0);
            } catch (JSONException ignored) {
                return "{\"ok\":false,\"message\":\"json error\"}";
            }
        } catch (Exception error) {
            putError(result, error);
        }
        return result.toString();
    }

    @JavascriptInterface
    public String getInstalledBatch(String packagesJson) {
        JSONObject result = new JSONObject();
        JSONArray rows = new JSONArray();
        try {
            JSONArray packageNames = new JSONArray(packagesJson);
            for (int index = 0; index < packageNames.length(); index++) {
                String packageName = packageNames.optString(index);
                rows.put(new JSONObject(getInstalledInfo(packageName)));
            }
            result.put("ok", true);
            result.put("items", rows);
        } catch (Exception error) {
            putError(result, error);
        }
        return result.toString();
    }

    @JavascriptInterface
    public String downloadAndInstall(String itemJson) {
        JSONObject result = new JSONObject();
        try {
            JSONObject item = new JSONObject(itemJson);
            String packageName = item.optString("packageName", "").trim();
            String apkUrl = item.optString("apkUrl", "").trim();
            long remoteVersion = item.optLong("versionCode", 0L);
            String appName = item.optString("name", packageName);

            if (packageName.length() == 0 || apkUrl.length() == 0) {
                result.put("ok", false);
                result.put("code", "INVALID_UPDATE_ITEM");
                result.put("message", "缺少 packageName 或 apkUrl，無法下載安裝。");
                return result.toString();
            }

            InstalledInfo installed = getInstalled(packageName);
            if (installed.installed && remoteVersion > 0 && installed.versionCode >= remoteVersion) {
                result.put("ok", false);
                result.put("code", "DUPLICATE_VERSION");
                result.put("message", "目前版本已是 " + installed.versionName + "，已排除重複安裝。");
                return result.toString();
            }

            if (!canRequestPackageInstalls()) {
                openInstallPermission();
                result.put("ok", false);
                result.put("code", "NEED_INSTALL_PERMISSION");
                result.put("message", "請先允許申悅助手安裝未知來源 APK，再回到更新中心重試。");
                return result.toString();
            }

            UpdateTask task = new UpdateTask(String.valueOf(System.currentTimeMillis()), appName, packageName);
            tasks.put(task.id, task);
            result.put("ok", true);
            result.put("taskId", task.id);
            result.put("message", "已開始下載 " + appName);
            executor.execute(() -> runDownloadAndInstall(task, item));
        } catch (Exception error) {
            putError(result, error);
        }
        return result.toString();
    }

    @JavascriptInterface
    public String getTaskStatus(String taskId) {
        UpdateTask task = tasks.get(taskId);
        if (task == null) {
            return "{\"ok\":false,\"message\":\"找不到下載任務\"}";
        }
        return task.toJson().toString();
    }

    @JavascriptInterface
    public void openInstallPermission() {
        activity.runOnUiThread(() -> {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + activity.getPackageName()));
            } else {
                intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            }

            try {
                activity.startActivity(intent);
            } catch (ActivityNotFoundException error) {
                activity.startActivity(new Intent(Settings.ACTION_SETTINGS));
            }
        });
    }

    @JavascriptInterface
    public String getVideoAccessState() {
        JSONObject result = new JSONObject();
        try {
            result.put("ok", true);
            appendVideoAccessState(result);
        } catch (Exception error) {
            putError(result, error);
        }
        return result.toString();
    }

    @JavascriptInterface
    public void requestVideoAccess() {
        activity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !hasVideoReadPermission()) {
                activity.requestPermissions(new String[] { getVideoReadPermission() }, VIDEO_PERMISSION_REQUEST_CODE);
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    && !Environment.isExternalStorageManager()
                    && !canScanRawExternalFiles()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + activity.getPackageName()));
                try {
                    activity.startActivity(intent);
                } catch (ActivityNotFoundException error) {
                    activity.startActivity(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
                }
                return;
            }

            Toast.makeText(activity, "影片讀取權限已可用。", Toast.LENGTH_LONG).show();
        });
    }

    @JavascriptInterface
    public String listLocalVideos() {
        return buildLocalVideosResult().toString();
    }

    @JavascriptInterface
    public String listLocalVideosAsync() {
        LocalVideoScanTask task = new LocalVideoScanTask("scan-" + System.currentTimeMillis());
        videoScanTasks.put(task.id, task);
        localVideoExecutor.execute(() -> runLocalVideoScan(task));
        return task.toJson().toString();
    }

    @JavascriptInterface
    public String getLocalVideoScanStatus(String taskId) {
        LocalVideoScanTask task = videoScanTasks.get(taskId == null ? "" : taskId);
        if (task == null) {
            return "{\"ok\":false,\"message\":\"找不到影片掃描任務。\"}";
        }
        return task.toJson().toString();
    }

    private void runLocalVideoScan(LocalVideoScanTask task) {
        task.status = "running";
        task.progress = 5;
        task.message = "正在尋找 USB1 / USB2 / USB3 與環景影片...";
        try {
            JSONObject result = buildLocalVideosResult(task);
            task.complete(result);
        } catch (Exception error) {
            task.fail(error.getMessage() == null ? error.toString() : error.getMessage());
        }
    }

    private JSONObject buildLocalVideosResult() {
        return buildLocalVideosResult(null);
    }

    private JSONObject buildLocalVideosResult(LocalVideoScanTask progressTask) {
        JSONObject result = new JSONObject();
        JSONArray items = new JSONArray();
        JSONArray scanRoots = new JSONArray();
        Set<String> seen = new HashSet<>();
        ScanState scanState = new ScanState();
        try {
            appendVideoAccessState(result);
            if (!hasVideoReadPermission() && !hasAllFilesAccess()) {
                result.put("ok", false);
                result.put("code", "NEED_VIDEO_PERMISSION");
                result.put("message", "請先允許讀取影片；完整讀取環景/USB/車機影片可能需要所有檔案存取。");
                result.put("items", items);
                result.put("scanRoots", scanRoots);
                return result;
            }

            if (canScanRawExternalFiles()) {
                scanUsbCameraVideoFiles(items, seen, scanRoots, scanState, progressTask);
            }
            queryVideoStore(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, items, seen, scanState);
            queryVideoStore(MediaStore.Video.Media.INTERNAL_CONTENT_URI, items, seen, scanState);

            JSONArray sortedItems = sortVideoItems(items);

            result.put("ok", true);
            result.put("items", sortedItems);
            result.put("count", sortedItems.length());
            result.put("scanLimit", LOCAL_VIDEO_SCAN_LIMIT);
            result.put("scanTruncated", scanState.truncated);
            result.put("scannedDirectories", scanState.directories);
            result.put("scannedFiles", scanState.files);
            result.put("unreadableDirectories", scanState.unreadableDirectories);
            result.put("scanRoots", scanRoots);
            result.put("scanPaths", "USB1/USB2/USB3 + 動態可移除磁碟 + MediaStore；全資料夾 MP4/TS/MOV/AVI/MKV/WebM/DAV/H264/H265");
        } catch (Exception error) {
            putError(result, error);
            try {
                result.put("items", items);
                result.put("scanRoots", scanRoots);
            } catch (JSONException ignored) {
                // JSON error while reporting another error.
            }
        }
        return result;
    }

    @JavascriptInterface
    public String prepareLocalVideo(String source, String fileName, String mimeType) {
        JSONObject result = new JSONObject();
        try {
            String safeSource = source == null ? "" : source.trim();
            if (safeSource.length() == 0) {
                result.put("ok", false);
                result.put("message", "No local video was selected.");
                return result.toString();
            }

            PreparedVideo prepared = preparePlayableVideo(safeSource, fileName, mimeType);
            result.put("ok", true);
            result.put("uri", prepared.uri);
            result.put("fileName", prepared.fileName);
            result.put("mimeType", prepared.mimeType);
            result.put("size", prepared.size);
            result.put("converted", prepared.converted);
        } catch (Exception error) {
            putError(result, error);
        }
        return result.toString();
    }

    @JavascriptInterface
    public String prepareLocalVideoAsync(String source, String fileName, String mimeType) {
        JSONObject result = new JSONObject();
        try {
            String safeSource = source == null ? "" : source.trim();
            if (safeSource.length() == 0) {
                result.put("ok", false);
                result.put("message", "No local video was selected.");
                return result.toString();
            }

            String id = "video-" + System.currentTimeMillis();
            VideoPrepareTask task = new VideoPrepareTask(id);
            videoPrepareTasks.put(id, task);
            result.put("ok", true);
            result.put("taskId", id);
            result.put("status", task.status);
            result.put("progress", task.progress);
            result.put("message", task.message);
            executor.execute(() -> runPrepareLocalVideo(task, safeSource, fileName, mimeType));
        } catch (Exception error) {
            putError(result, error);
        }
        return result.toString();
    }

    @JavascriptInterface
    public String getLocalVideoPrepareStatus(String taskId) {
        VideoPrepareTask task = videoPrepareTasks.get(taskId == null ? "" : taskId);
        if (task == null) {
            return "{\"ok\":false,\"message\":\"Video prepare task was not found.\"}";
        }
        return task.toJson().toString();
    }

    @JavascriptInterface
    public String uploadLocalVideo(String source, String fileName, String mimeType, String endpoint, String mode, String token) {
        return uploadLocalVideoInternal(source, fileName, mimeType, endpoint, mode, token, true);
    }

    @JavascriptInterface
    public String uploadLocalVideoOriginal(String source, String fileName, String mimeType, String endpoint, String mode, String token) {
        return uploadLocalVideoInternal(source, fileName, mimeType, endpoint, mode, token, false);
    }

    @JavascriptInterface
    public String uploadLocalVideoAsync(String source, String fileName, String mimeType, String endpoint, String mode, String token) {
        return uploadLocalVideoAsyncInternal(source, fileName, mimeType, endpoint, mode, token, true);
    }

    @JavascriptInterface
    public String uploadLocalVideoOriginalAsync(String source, String fileName, String mimeType, String endpoint, String mode, String token) {
        return uploadLocalVideoAsyncInternal(source, fileName, mimeType, endpoint, mode, token, false);
    }

    @JavascriptInterface
    public String getLocalVideoUploadStatus(String taskId) {
        VideoUploadTask task = videoUploadTasks.get(taskId == null ? "" : taskId);
        if (task == null) {
            return "{\"ok\":false,\"message\":\"Video upload task was not found.\"}";
        }
        return task.toJson().toString();
    }

    @JavascriptInterface
    public String createLocalVideoShare(String source, String fileName, String mimeType) {
        return createLocalVideoShareInternal(source, fileName, mimeType);
    }

    @JavascriptInterface
    public String createLastSelectedVideoShare(String fileName, String mimeType) {
        Uri uri = lastSelectedFileUri;
        if (uri == null) {
            JSONObject result = new JSONObject();
            try {
                result.put("ok", false);
                result.put("message", "找不到剛剛選取的影片 URI。");
            } catch (JSONException ignored) {
                // JSON error while reporting another error.
            }
            return result.toString();
        }
        return createLocalVideoShareInternal(uri.toString(), fileName, mimeType);
    }

    private String createLocalVideoShareInternal(String source, String fileName, String mimeType) {
        JSONObject result = new JSONObject();
        VideoInput video = null;
        try {
            String safeSource = source == null ? "" : source.trim();
            if (safeSource.length() == 0) {
                result.put("ok", false);
                result.put("message", "沒有選擇本機影片。");
                return result.toString();
            }

            int port = ensureLocalVideoServer();
            String host = getLocalNetworkAddress();
            if (host.length() == 0) {
                result.put("ok", false);
                result.put("message", "找不到車機區域網路 IP，請確認手機與車機在同一 Wi-Fi。");
                return result.toString();
            }

            video = openVideoInput(safeSource, fileName, mimeType, false);
            cleanupExpiredLocalVideoShares();
            String token = UUID.randomUUID().toString().replace("-", "");
            LocalVideoShare share = new LocalVideoShare(
                    token,
                    safeSource,
                    video.fileName,
                    video.mimeType,
                    video.size,
                    System.currentTimeMillis() + LOCAL_SHARE_TTL_MS
            );
            localVideoShares.put(token, share);
            beginPhoneSavePreparation(share);
            String encodedName = URLEncoder.encode(share.fileName, "UTF-8").replace("+", "%20");
            String downloadName = phoneSaveFileName(share.fileName, share.mimeType);
            String downloadMimeType = needsPhoneSaveRemux(share.fileName, share.mimeType) ? "video/mp4" : share.mimeType;
            String encodedDownloadName = URLEncoder.encode(downloadName, "UTF-8").replace("+", "%20");
            String baseUrl = "http://" + host + ":" + port;
            String localWatchUrl = baseUrl + "/local-watch/" + token;
            String originalUrl = baseUrl + "/local-video/" + token + "/" + encodedName;
            String playUrl = baseUrl + "/local-play/" + token + "/" + encodedDownloadName;
            String downloadUrl = baseUrl + "/local-download/" + token + "/" + encodedDownloadName;
            String statusUrl = baseUrl + "/local-status/" + token;
            String cloudWatchUrl = buildCloudWatchUrl(token, downloadName, downloadMimeType, share.size, downloadUrl, originalUrl, localWatchUrl);
            String receiverUrl = buildReplayReceiverUrl(downloadUrl, statusUrl, downloadName, downloadMimeType, share.size);
            share.receiverUrl = receiverUrl;
            String watchUrl = localWatchUrl;
            String qrDataUrl = "";
            String receiverQrDataUrl = "";
            try {
                qrDataUrl = createQrDataUrl(watchUrl);
                receiverQrDataUrl = createQrDataUrl(receiverUrl);
            } catch (Exception ignored) {
                // The web layer still has an online QR fallback if local generation fails.
            }
            result.put("ok", true);
            result.put("mode", "local-fast");
            result.put("publicUrl", watchUrl);
            result.put("url", watchUrl);
            result.put("watchUrl", watchUrl);
            result.put("localWatchUrl", localWatchUrl);
            result.put("cloudWatchUrl", cloudWatchUrl);
            result.put("videoUrl", playUrl);
            result.put("downloadUrl", downloadUrl);
            result.put("statusUrl", statusUrl);
            result.put("originalUrl", originalUrl);
            result.put("receiverUrl", receiverUrl);
            if (qrDataUrl.length() > 0) result.put("qrDataUrl", qrDataUrl);
            if (receiverQrDataUrl.length() > 0) result.put("receiverQrDataUrl", receiverQrDataUrl);
            result.put("fileName", share.fileName);
            result.put("mimeType", share.mimeType);
            result.put("size", share.size);
            result.put("prepareRequired", needsPhoneSaveRemux(share.fileName, share.mimeType));
            result.put("ttlMinutes", LOCAL_SHARE_TTL_MS / 60000L);
        } catch (Exception error) {
            putError(result, error);
        } finally {
            if (video != null) {
                try {
                    video.input.close();
                } catch (Exception ignored) {
                    // Closing best effort.
                }
            }
        }
        return result.toString();
    }

    private String phoneSaveFileName(String fileName, String mimeType) {
        String name = normalizedVideoName(fileName);
        return needsPhoneSaveRemux(name, mimeType) ? toMp4FileName(name) : name;
    }

    private String normalizedVideoName(String fileName) {
        String name = fileName == null ? "" : fileName.trim();
        return name.length() == 0 ? "replay-video.mp4" : name;
    }

    private String buildCloudWatchUrl(
            String token,
            String fileName,
            String mimeType,
            long size,
            String downloadUrl,
            String originalUrl,
            String localWatchUrl
    ) throws Exception {
        String home = BuildConfig.HOME_URL == null ? "" : BuildConfig.HOME_URL.trim();
        if (!home.startsWith("https://")) home = CLOUD_HOME_URL;
        if (!home.endsWith("/")) home = home + "/";
        return home
                + "replay-center/watch/?v=" + urlEncode(downloadUrl)
                + "&n=" + urlEncode(fileName)
                + "&m=" + urlEncode(mimeType == null || mimeType.length() == 0 ? "video/mp4" : mimeType)
                + "&s=" + urlEncode(String.valueOf(size))
                + "&uid=" + urlEncode(token)
                + "&source=" + urlEncode("local-fast")
                + "&original=" + urlEncode(originalUrl)
                + "&fallback=" + urlEncode(localWatchUrl)
                + "&download=1"
                + "&auto=1";
    }

    private String buildReplayReceiverUrl(
            String downloadUrl,
            String statusUrl,
            String fileName,
            String mimeType,
            long size
    ) throws Exception {
        return "shenyue-replay://download"
                + "?url=" + urlEncode(downloadUrl)
                + "&status=" + urlEncode(statusUrl)
                + "&name=" + urlEncode(fileName)
                + "&mime=" + urlEncode(mimeType == null || mimeType.length() == 0 ? "video/mp4" : mimeType)
                + "&size=" + urlEncode(String.valueOf(size));
    }

    private void cleanupExpiredLocalVideoShares() {
        long now = System.currentTimeMillis();
        for (Map.Entry<String, LocalVideoShare> entry : localVideoShares.entrySet()) {
            LocalVideoShare share = entry.getValue();
            if (share == null || share.expiresAt >= now) continue;
            if (localVideoShares.remove(entry.getKey(), share)) deletePreparedShareFile(share);
        }
    }

    private void deletePreparedShareFile(LocalVideoShare share) {
        if (share == null || share.phoneSource.length() == 0 || share.phoneSource.equals(share.source)) return;
        try {
            Uri uri = Uri.parse(share.phoneSource);
            File file = "file".equalsIgnoreCase(uri.getScheme()) ? new File(uri.getPath()) : new File(share.phoneSource);
            String cachePath = activity.getCacheDir().getCanonicalPath();
            String filePath = file.getCanonicalPath();
            if (filePath.startsWith(cachePath + File.separator)) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
        } catch (Exception ignored) {
            // Cache cleanup is best effort only.
        }
    }

    private void beginPhoneSavePreparation(LocalVideoShare share) {
        if (share == null) return;
        synchronized (share) {
            if (share.prepareStarted) return;
            share.prepareStarted = true;
            if (!needsPhoneSaveRemux(share.fileName, share.mimeType)) {
                useOriginalVideoForPhone(share, "影片已可直接下載。", "");
                return;
            }
            share.prepareTask.status = "queued";
            share.prepareTask.progress = 0;
            share.prepareTask.message = "等待轉成手機可用影片";
        }
        localVideoExecutor.execute(() -> preparePhoneSaveVideo(share));
    }

    private void preparePhoneSaveVideo(LocalVideoShare share) {
        VideoPrepareTask task = share.prepareTask;
        try {
            task.status = "running";
            task.progress = Math.max(1, task.progress);
            task.message = "正在轉成手機可用 MP4...";
            PreparedVideo prepared = preparePlayableVideo(share.source, share.fileName, share.mimeType, task);
            synchronized (share) {
                share.phoneSource = prepared.uri;
                share.phoneFileName = prepared.fileName;
                share.phoneMimeType = prepared.mimeType;
                share.phoneSize = prepared.size;
                share.prepareWarning = "";
                task.uri = prepared.uri;
                task.fileName = prepared.fileName;
                task.mimeType = prepared.mimeType;
                task.size = prepared.size;
                task.converted = prepared.converted;
                task.indeterminate = false;
                task.progress = 100;
                task.status = "done";
                task.message = prepared.converted ? "MP4 準備完成。" : "影片準備完成。";
                share.notifyAll();
            }
        } catch (Exception error) {
            synchronized (share) {
                String warning = "此影片無法在車機端轉成 MP4，已安全改用完整原始檔：" + safeMessage(error);
                useOriginalVideoForPhone(share, "原始完整影片已準備完成。", warning);
                share.notifyAll();
            }
        }
    }

    private void useOriginalVideoForPhone(LocalVideoShare share, String message, String warning) {
        share.phoneSource = share.source;
        share.phoneFileName = normalizedVideoName(share.fileName);
        share.phoneMimeType = share.mimeType == null || share.mimeType.length() == 0
                ? guessVideoMime(share.phoneFileName)
                : share.mimeType;
        share.phoneSize = share.size;
        share.prepareWarning = warning == null ? "" : warning;
        VideoPrepareTask task = share.prepareTask;
        task.uri = share.phoneSource;
        task.fileName = share.phoneFileName;
        task.mimeType = share.phoneMimeType;
        task.size = share.phoneSize;
        task.converted = false;
        task.indeterminate = false;
        task.progress = 100;
        task.status = "done";
        task.message = message;
    }

    private JSONObject localShareStatus(LocalVideoShare share) {
        beginPhoneSavePreparation(share);
        JSONObject result = share.prepareTask.toJson();
        try {
            result.put("ok", true);
            result.put("token", share.token);
            result.put("expiresAt", share.expiresAt);
            if (share.prepareWarning.length() > 0) result.put("warning", share.prepareWarning);
        } catch (JSONException ignored) {
            // All fields are JSON-compatible primitives.
        }
        return result;
    }

    private boolean needsPhoneSaveRemux(String fileName, String mimeType) {
        String name = fileName == null ? "" : fileName.toLowerCase(Locale.US);
        String type = mimeType == null ? "" : mimeType.toLowerCase(Locale.US);
        return isTransportStreamName(name)
                || isTransportStreamMime(mimeType)
                || isQuickTimeName(name)
                || isQuickTimeMime(type)
                || name.endsWith(".mkv")
                || name.endsWith(".avi")
                || name.endsWith(".webm")
                || name.endsWith(".3gp")
                || name.endsWith(".3g2")
                || name.endsWith(".dav")
                || name.endsWith(".264")
                || name.endsWith(".h264")
                || name.endsWith(".hevc")
                || name.endsWith(".h265")
                || type.contains("matroska")
                || type.contains("msvideo")
                || type.contains("webm")
                || "application/octet-stream".equals(type);
    }

    private String uploadLocalVideoAsyncInternal(String source, String fileName, String mimeType, String endpoint, String mode, String token, boolean remuxTransportStreams) {
        JSONObject result = new JSONObject();
        try {
            String safeSource = source == null ? "" : source.trim();
            String safeEndpoint = endpoint == null ? "" : endpoint.trim();
            if (safeSource.length() == 0) {
                result.put("ok", false);
                result.put("message", "沒有選擇本機影片。");
                return result.toString();
            }
            if (safeEndpoint.length() == 0) {
                result.put("ok", false);
                result.put("message", "沒有設定上傳 API。");
                return result.toString();
            }

            String id = "upload-" + System.currentTimeMillis();
            VideoUploadTask task = new VideoUploadTask(id);
            task.fileName = fileName == null ? "" : fileName;
            task.mimeType = mimeType == null ? "" : mimeType;
            videoUploadTasks.put(id, task);
            executor.execute(() -> runUploadLocalVideo(task, safeSource, fileName, mimeType, safeEndpoint, mode, token, remuxTransportStreams));
            return task.toJson().toString();
        } catch (Exception error) {
            putError(result, error);
            return result.toString();
        }
    }

    private String uploadLocalVideoInternal(String source, String fileName, String mimeType, String endpoint, String mode, String token, boolean remuxTransportStreams) {
        JSONObject result = new JSONObject();
        VideoInput video = null;
        try {
            String safeSource = source == null ? "" : source.trim();
            String safeEndpoint = endpoint == null ? "" : endpoint.trim();
            if (safeSource.length() == 0) {
                result.put("ok", false);
                result.put("message", "沒有選擇本機影片。");
                return result.toString();
            }
            if (safeEndpoint.length() == 0) {
                result.put("ok", false);
                result.put("message", "沒有設定上傳 API。");
                return result.toString();
            }

            video = openVideoInput(safeSource, fileName, mimeType, remuxTransportStreams);
            String responseText = uploadVideoToEndpoint(video, safeEndpoint, mode, token, null);
            result = parseUploadResponse(responseText);
            result.put("ok", true);
            result.put("fileName", video.fileName);
            result.put("size", video.size);
            result.put("mimeType", video.mimeType);
        } catch (Exception error) {
            putError(result, error);
        } finally {
            if (video != null) {
                try {
                    video.input.close();
                } catch (Exception ignored) {
                    // Closing best effort.
                }
            }
        }
        return result.toString();
    }

    private void runUploadLocalVideo(VideoUploadTask task, String source, String fileName, String mimeType, String endpoint, String mode, String token, boolean remuxTransportStreams) {
        VideoInput video = null;
        try {
            task.status = "running";
            task.progress = 1;
            task.message = "讀取影片 1%";
            video = openVideoInput(source, fileName, mimeType, remuxTransportStreams);
            task.fileName = video.fileName;
            task.mimeType = video.mimeType;
            task.size = video.size;

            task.progress = Math.max(task.progress, 2);
            task.message = "開始上傳 2%";
            String responseText = uploadVideoToEndpoint(video, endpoint, mode, token, task);
            task.progress = Math.max(task.progress, 98);
            task.message = "處理伺服器回應 98%";
            JSONObject uploadResult = parseUploadResponse(responseText);
            task.complete(uploadResult, video);
        } catch (Exception error) {
            task.fail(safeMessage(error));
        } finally {
            if (video != null) {
                try {
                    video.input.close();
                } catch (Exception ignored) {
                    // Closing best effort.
                }
            }
        }
    }

    @JavascriptInterface
    public String inspectLastSelectedApk(String fileName) {
        JSONObject result = new JSONObject();
        try {
            Uri uri = lastSelectedFileUri;
            if (uri == null) {
                result.put("ok", false);
                result.put("message", "找不到剛剛選擇的 APK 檔案。");
                return result.toString();
            }
            File apkFile = copySelectedApkToCache(uri, fileName);
            return inspectApkFile(apkFile).toString();
        } catch (Exception error) {
            putError(result, error);
            return result.toString();
        }
    }

    private void appendVideoAccessState(JSONObject result) throws JSONException {
        result.put("sdk", Build.VERSION.SDK_INT);
        result.put("readVideoGranted", hasVideoReadPermission());
        result.put("allFilesGranted", hasAllFilesAccess());
        result.put("targetSdk", getSelfTargetSdk());
        result.put("rawScanEnabled", canScanRawExternalFiles());
        result.put("readPermission", getVideoReadPermission());
        result.put("nativeVideoBridge", true);
    }

    private boolean hasVideoReadPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return activity.checkSelfPermission(getVideoReadPermission()) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasAllFilesAccess() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.R || Environment.isExternalStorageManager();
    }

    private boolean canScanRawExternalFiles() {
        return hasAllFilesAccess()
                || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                || (getSelfTargetSdk() <= 28 && hasVideoReadPermission());
    }

    private String getVideoReadPermission() {
        if (Build.VERSION.SDK_INT >= 33 && getSelfTargetSdk() >= 33) {
            return Manifest.permission.READ_MEDIA_VIDEO;
        }
        return Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private int getSelfTargetSdk() {
        try {
            ApplicationInfo appInfo = packageManager.getApplicationInfo(activity.getPackageName(), 0);
            return appInfo.targetSdkVersion;
        } catch (Exception ignored) {
            return Build.VERSION.SDK_INT;
        }
    }

    private void queryVideoStore(Uri storeUri, JSONArray items, Set<String> seen, ScanState scanState) {
        if (items.length() >= LOCAL_VIDEO_SCAN_LIMIT) {
            scanState.truncated = true;
            return;
        }

        List<String> columns = new ArrayList<>();
        columns.add(MediaStore.Video.Media._ID);
        columns.add(MediaStore.Video.Media.DISPLAY_NAME);
        columns.add(MediaStore.Video.Media.SIZE);
        columns.add(MediaStore.Video.Media.DATE_MODIFIED);
        columns.add(MediaStore.Video.Media.MIME_TYPE);
        columns.add(MediaStore.Video.Media.DURATION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            columns.add(MediaStore.Video.Media.RELATIVE_PATH);
        } else {
            columns.add(MediaStore.Video.Media.DATA);
        }

        try (Cursor cursor = activity.getContentResolver().query(
                storeUri,
                columns.toArray(new String[0]),
                null,
                null,
                MediaStore.Video.Media.DATE_MODIFIED + " DESC"
        )) {
            if (cursor == null) return;
            while (cursor.moveToNext()) {
                if (items.length() >= LOCAL_VIDEO_SCAN_LIMIT) {
                    scanState.truncated = true;
                    return;
                }
                long id = getCursorLong(cursor, MediaStore.Video.Media._ID, 0L);
                Uri uri = ContentUris.withAppendedId(storeUri, id);
                String uriValue = uri.toString();
                if (!seen.add(uriValue)) continue;

                JSONObject item = new JSONObject();
                String name = getCursorString(cursor, MediaStore.Video.Media.DISPLAY_NAME, "video-" + id + ".mp4");
                String relativePath = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                        ? getCursorString(cursor, MediaStore.Video.Media.RELATIVE_PATH, "")
                        : getCursorString(cursor, MediaStore.Video.Media.DATA, "");
                String pathForFilter = relativePath + " " + uriValue;
                if (!isLikelyVideoName(name)) continue;
                scanState.files += 1;
                item.put("id", "media-" + Math.abs(uriValue.hashCode()));
                item.put("uri", uriValue);
                item.put("name", name);
                item.put("size", getCursorLong(cursor, MediaStore.Video.Media.SIZE, 0L));
                item.put("modified", getCursorLong(cursor, MediaStore.Video.Media.DATE_MODIFIED, 0L) * 1000L);
                item.put("duration", getCursorLong(cursor, MediaStore.Video.Media.DURATION, 0L));
                item.put("mimeType", getCursorString(cursor, MediaStore.Video.Media.MIME_TYPE, guessVideoMime(name)));
                item.put("path", relativePath);
                item.put("source", describeReplayVideoSource(pathForFilter));
                items.put(item);
            }
        } catch (Exception ignored) {
            // Some car firmwares expose broken MediaStore providers; direct folder scan remains a fallback.
        }
    }

    private void scanUsbCameraVideoFiles(
            JSONArray items,
            Set<String> seen,
            JSONArray scanRoots,
            ScanState scanState,
            LocalVideoScanTask progressTask
    ) {
        List<File> roots = new ArrayList<>();
        addKnownUsbCameraRoots(roots, scanRoots);
        discoverStorageManagerVolumes(roots, scanRoots);
        discoverExternalFilesVolumes(roots, scanRoots);
        discoverMountTableVolumes(roots, scanRoots);
        discoverUsbCameraRoots(roots, scanRoots);

        Set<String> visitedDirectories = new HashSet<>();
        int totalRoots = Math.max(1, roots.size());
        for (int index = 0; index < roots.size(); index += 1) {
            if (items.length() >= LOCAL_VIDEO_SCAN_LIMIT) {
                scanState.truncated = true;
                return;
            }
            if (progressTask != null) {
                progressTask.progress = Math.min(90, 8 + (int) (((long) index * 82L) / totalRoots));
                progressTask.count = items.length();
                progressTask.message = "正在完整掃描 USB1 / USB2 / USB3 與環景影片，已找到 " + items.length() + " 個...";
            }
            scanRoot(roots.get(index), items, seen, visitedDirectories, scanState, progressTask);
        }
    }

    private void addKnownUsbCameraRoots(List<File> roots, JSONArray scanRoots) {
        File[] internalVolumes = {
                new File("/sdcard"),
                new File("/storage/emulated/0"),
                new File("/data/media/0"),
                new File("/mnt/sdcard")
        };
        for (File volume : internalVolumes) {
            addReplayVideoRoots(roots, volume, scanRoots);
        }

        File[] removableVolumes = {
                new File("/storage/sdcard1"),
                new File("/storage/sdcard2"),
                new File("/storage/sdcard3"),
                new File("/storage/usb_storage"),
                new File("/mnt/media_rw/usb_storage"),
                new File("/mnt/usb_storage"),
                new File("/mnt/usbhost"),
                new File("/storage/usbotg"),
                new File("/storage/udisk"),
                new File("/storage/udisk1"),
                new File("/storage/udisk2"),
                new File("/mnt/udisk"),
                new File("/mnt/udisk1"),
                new File("/mnt/udisk2")
        };
        for (File volume : removableVolumes) {
            addFullReplayVolume(roots, volume, scanRoots);
        }

        File[] directRoots = {
                new File("/aw3603D"),
                new File("/360res/aw3603D"),
                new File("/sdcard/aw3603D"),
                new File("/sdcard/360res/aw3603D"),
                new File("/storage/emulated/0/aw3603D"),
                new File("/storage/emulated/0/360res/aw3603D"),
                new File("/data/media/0/aw3603D"),
                new File("/data/media/0/360res/aw3603D")
        };
        for (File root : directRoots) {
            addRoot(roots, root, scanRoots);
        }

        String[] parents = {
                "/storage",
                "/sdcard",
                "/data/media/0",
                "/mnt/media_rw",
                "/storage/usb_storage",
                "/mnt/usb_storage",
                "/mnt",
                "/mnt/media_rw/usb_storage"
        };
        String[] volumes = {
                "USB1", "USB2", "USB3", "usb1", "usb2", "usb3", "Usb1", "Usb2", "Usb3",
                "USB_DISK0", "USB_DISK1", "USB_DISK2", "usb_storage",
                "sdcard1", "sdcard2", "sdcard3", "udisk", "udisk1", "udisk2", "usbotg",
                "Storage01", "Storage02", "Storage03"
        };
        for (String parent : parents) {
            for (String volume : volumes) {
                addFullReplayVolume(roots, new File(parent, volume), scanRoots);
            }
        }
    }

    private void discoverStorageManagerVolumes(List<File> roots, JSONArray scanRoots) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return;
        try {
            StorageManager manager = (StorageManager) activity.getSystemService(Context.STORAGE_SERVICE);
            if (manager == null) return;
            for (StorageVolume volume : manager.getStorageVolumes()) {
                File root = resolveStorageVolumeDirectory(volume);
                if (root == null) continue;
                if (volume.isRemovable() || looksLikeRemovableVolume(root)) {
                    addFullReplayVolume(roots, root, scanRoots);
                } else {
                    addReplayVideoRoots(roots, root, scanRoots);
                }
            }
        } catch (Exception ignored) {
            // Vendor storage services are inconsistent; the mount and directory fallbacks run next.
        }
    }

    private File resolveStorageVolumeDirectory(StorageVolume volume) {
        if (volume == null) return null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                return volume.getDirectory();
            } catch (Exception ignored) {
                // Reflection fallbacks below support older/vendor Android builds.
            }
        }
        String[] methodNames = {"getPathFile", "getPath"};
        for (String methodName : methodNames) {
            try {
                Object value = volume.getClass().getMethod(methodName).invoke(volume);
                if (value instanceof File) return (File) value;
                if (value instanceof String && ((String) value).length() > 0) return new File((String) value);
            } catch (Exception ignored) {
                // Try the next vendor-compatible method.
            }
        }
        return null;
    }

    private void discoverExternalFilesVolumes(List<File> roots, JSONArray scanRoots) {
        try {
            File[] appDirectories = activity.getExternalFilesDirs(null);
            if (appDirectories == null) return;
            for (File appDirectory : appDirectories) {
                File volumeRoot = storageRootFromExternalFilesDirectory(appDirectory);
                if (volumeRoot == null) continue;
                if (looksLikeRemovableVolume(volumeRoot)) {
                    addFullReplayVolume(roots, volumeRoot, scanRoots);
                } else {
                    addReplayVideoRoots(roots, volumeRoot, scanRoots);
                }
            }
        } catch (Exception ignored) {
            // Continue with known and mount-table roots.
        }
    }

    private File storageRootFromExternalFilesDirectory(File directory) {
        File current = directory;
        for (int depth = 0; current != null && depth < 10; depth += 1) {
            if ("Android".equalsIgnoreCase(current.getName())) return current.getParentFile();
            current = current.getParentFile();
        }
        return null;
    }

    private void discoverMountTableVolumes(List<File> roots, JSONArray scanRoots) {
        File mounts = new File("/proc/mounts");
        if (!mounts.canRead()) return;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(mounts), "UTF-8"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.trim().split("\\s+");
                if (parts.length < 2) continue;
                String mountPath = parts[1].replace("\\040", " ");
                File root = new File(mountPath);
                if (looksLikeRemovableVolume(root)) addFullReplayVolume(roots, root, scanRoots);
            }
        } catch (Exception ignored) {
            // Mount-table access is optional.
        }
    }

    private void discoverUsbCameraRoots(List<File> roots, JSONArray scanRoots) {
        File[] parents = {
                new File("/storage"),
                new File("/mnt/media_rw"),
                new File("/storage/usb_storage"),
                new File("/mnt/usb_storage"),
                new File("/mnt/media_rw/usb_storage"),
                new File("/mnt/usbhost"),
                new File("/mnt")
        };
        for (File parent : parents) {
            File[] children;
            try {
                children = parent.listFiles();
            } catch (Exception error) {
                continue;
            }
            if (children == null) continue;
            for (File child : children) {
                if (!child.isDirectory() || isIgnoredStorageName(child.getName())) continue;
                if (looksLikeRemovableVolume(child)) addFullReplayVolume(roots, child, scanRoots);
                File[] grandchildren;
                try {
                    grandchildren = child.listFiles();
                } catch (Exception error) {
                    continue;
                }
                if (grandchildren == null) continue;
                for (File grandchild : grandchildren) {
                    if (grandchild.isDirectory()
                            && !isIgnoredStorageName(grandchild.getName())
                            && looksLikeRemovableVolume(grandchild)) {
                        addFullReplayVolume(roots, grandchild, scanRoots);
                    }
                }
            }
        }
    }

    private boolean looksLikeRemovableVolume(File root) {
        if (root == null) return false;
        String path = normalizePath(root.getAbsolutePath());
        String name = root.getName() == null ? "" : root.getName().toLowerCase(Locale.US);
        return path.contains("/media_rw/")
                || path.contains("/usb")
                || path.contains("/udisk")
                || path.contains("/usbotg")
                || name.matches("usb(?:_disk)?[0-9]+")
                || name.matches("sdcard[1-9][0-9]*")
                || name.matches("storage[0-9]+")
                || name.matches("udisk[0-9]*")
                || name.matches("[0-9a-f]{4}-[0-9a-f]{4}");
    }

    private void addFullReplayVolume(List<File> roots, File volumeRoot, JSONArray scanRoots) {
        addRoot(roots, volumeRoot, scanRoots);
        addReplayVideoRoots(roots, volumeRoot, scanRoots);
    }

    private void addReplayVideoRoots(List<File> roots, File volumeRoot, JSONArray scanRoots) {
        addRoot(roots, new File(new File(volumeRoot, "DCIM"), "CAMERA"), scanRoots);
        addRoot(roots, new File(new File(volumeRoot, "DCIM"), "Camera"), scanRoots);
        addRoot(roots, new File(new File(volumeRoot, "DCIM"), "camera"), scanRoots);
        addRoot(roots, new File(volumeRoot, "DCIM"), scanRoots);
        addRoot(roots, new File(volumeRoot, "Movies"), scanRoots);
        addRoot(roots, new File(volumeRoot, "Video"), scanRoots);
        addRoot(roots, new File(volumeRoot, "Videos"), scanRoots);
        addRoot(roots, new File(volumeRoot, "Download"), scanRoots);
        addRoot(roots, new File(volumeRoot, "aw3603D"), scanRoots);
        addRoot(roots, new File(new File(volumeRoot, "360res"), "aw3603D"), scanRoots);
        addRoot(roots, new File(volumeRoot, "360"), scanRoots);
        addRoot(roots, new File(volumeRoot, "360Video"), scanRoots);
        addRoot(roots, new File(volumeRoot, "DVR"), scanRoots);
        addRoot(roots, new File(volumeRoot, "Record"), scanRoots);
        addRoot(roots, new File(volumeRoot, "Recorder"), scanRoots);
        addRoot(roots, new File(volumeRoot, "CarRecorder"), scanRoots);
        addRoot(roots, new File(volumeRoot, "CarDVR"), scanRoots);
        addRoot(roots, new File(volumeRoot, "DashCam"), scanRoots);
        addRoot(roots, new File(volumeRoot, "dashcam"), scanRoots);
    }

    private void addRoot(List<File> roots, File root, JSONArray scanRoots) {
        if (root != null && root.exists() && root.canRead()) {
            String rootPath;
            try {
                rootPath = root.getCanonicalPath();
            } catch (Exception error) {
                rootPath = root.getAbsolutePath();
            }
            for (File existing : roots) {
                try {
                    if (existing.getCanonicalPath().equals(rootPath)) return;
                } catch (Exception ignored) {
                    if (existing.getAbsolutePath().equals(root.getAbsolutePath())) return;
                }
            }
            roots.add(root);
            if (scanRoots != null) scanRoots.put(rootPath);
        }
    }

    private void scanRoot(
            File root,
            JSONArray items,
            Set<String> seen,
            Set<String> visitedDirectories,
            ScanState scanState,
            LocalVideoScanTask progressTask
    ) {
        ArrayDeque<File> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty() && items.length() < LOCAL_VIDEO_SCAN_LIMIT) {
            File current = queue.removeFirst();
            String directoryKey = canonicalPath(current);
            if (!visitedDirectories.add(directoryKey)) continue;
            scanState.directories += 1;
            File[] children;
            try {
                children = current.listFiles();
            } catch (Exception error) {
                scanState.unreadableDirectories += 1;
                continue;
            }
            if (children == null) {
                scanState.unreadableDirectories += 1;
                continue;
            }
            try {
                java.util.Arrays.sort(children, Comparator
                        .comparing((File value) -> !value.isDirectory())
                        .thenComparing(value -> value.getName().toLowerCase(Locale.US)));
            } catch (Exception ignored) {
                // Filesystem order is still safe if a vendor implementation cannot be sorted.
            }

            for (File child : children) {
                if (items.length() >= LOCAL_VIDEO_SCAN_LIMIT) {
                    scanState.truncated = true;
                    return;
                }
                if (child.isDirectory()) {
                    queue.add(child);
                } else {
                    scanState.files += 1;
                    if (!isLikelyVideoFile(child)) continue;
                    String fileKey = "file:" + canonicalPath(child);
                    if (!seen.add(fileKey)) continue;
                    String uri = Uri.fromFile(child).toString();
                    try {
                        JSONObject item = new JSONObject();
                        item.put("id", "file-" + Math.abs(child.getAbsolutePath().hashCode()));
                        item.put("uri", uri);
                        item.put("name", child.getName());
                        item.put("size", child.length());
                        item.put("modified", child.lastModified());
                        item.put("duration", 0);
                        item.put("mimeType", guessVideoMime(child.getName()));
                        item.put("path", child.getParent());
                        item.put("source", describeReplayVideoSource(child.getAbsolutePath()));
                        items.put(item);
                    } catch (JSONException ignored) {
                        // Skip malformed row only.
                    }
                }
            }

            if (progressTask != null && scanState.directories % 20 == 0) {
                progressTask.count = items.length();
                progressTask.message = "正在完整掃描 USB1 / USB2 / USB3，已找到 " + items.length()
                        + " 個影片（檢查 " + scanState.directories + " 個資料夾）...";
            }
        }
        if (!queue.isEmpty()) {
            scanState.truncated = true;
        }
    }

    private String canonicalPath(File file) {
        try {
            return file.getCanonicalPath();
        } catch (Exception ignored) {
            return file.getAbsolutePath();
        }
    }

    private JSONArray sortVideoItems(JSONArray items) {
        List<JSONObject> values = new ArrayList<>();
        for (int index = 0; index < items.length(); index += 1) {
            JSONObject item = items.optJSONObject(index);
            if (item != null) values.add(item);
        }
        Collections.sort(values, (left, right) -> {
            int modified = Long.compare(right.optLong("modified", 0L), left.optLong("modified", 0L));
            if (modified != 0) return modified;
            return left.optString("name", "").compareToIgnoreCase(right.optString("name", ""));
        });
        JSONArray sorted = new JSONArray();
        for (JSONObject value : values) sorted.put(value);
        return sorted;
    }

    private boolean isIgnoredStorageName(String name) {
        String value = name == null ? "" : name.toLowerCase(Locale.US);
        return value.length() == 0
                || "self".equals(value)
                || "emulated".equals(value)
                || "legacy".equals(value)
                || "asec".equals(value)
                || "obb".equals(value)
                || "system".equals(value)
                || "vendor".equals(value)
                || "product".equals(value)
                || "apex".equals(value)
                || "data".equals(value);
    }

    private String describeReplayVideoSource(String path) {
        String value = normalizePath(path);
        String location = "車機影片";
        if (value.contains("/usb3/") || value.contains("/usb_disk2/")) location = "USB3";
        else if (value.contains("/usb2/") || value.contains("/usb_disk1/")) location = "USB2";
        else if (value.contains("/usb1/") || value.contains("/usb_disk0/")) location = "USB1";
        else if (value.contains("/sdcard3/")) location = "USB3/sdcard3";
        else if (value.contains("/sdcard2/")) location = "USB2/sdcard2";
        else if (value.contains("/sdcard1/")) location = "USB1/sdcard1";
        else if (value.contains("/usb_storage/")) location = "usb_storage";
        else if (value.contains("/udisk2/")) location = "USB3/udisk2";
        else if (value.contains("/udisk1/")) location = "udisk1";
        else if (value.contains("/udisk/")) location = "udisk";
        else if (value.contains("/usbotg/")) location = "usbotg";
        else if (value.contains("/storage03/")) location = "USB3/Storage03";
        else if (value.contains("/storage01/")) location = "Storage01";
        else if (value.contains("/storage02/")) location = "Storage02";
        else if (value.contains("/storage/emulated/0/") || value.contains("/data/media/0/") || value.contains("/sdcard/")) location = "內部儲存";

        if (value.contains("/360res/aw3603d")) return location + "/360res/aw3603D";
        if (value.contains("/aw3603d")) return location + "/aw3603D";
        if (value.contains("/360")) return location + "/360環景";
        if (value.contains("/dvr") || value.contains("/cardvr")) return location + "/DVR";
        if (value.contains("/record") || value.contains("/recorder")) return location + "/Record";
        if (value.contains("/dashcam")) return location + "/DashCam";
        if (value.contains("/dcim/camera")) return location + "/DCIM/CAMERA";
        if (value.contains("/dcim")) return location + "/DCIM";
        if (value.contains("/movies") || value.contains("/video")) return location + "/影片";
        if (value.contains("/download")) return location + "/Download";
        return location;
    }

    private String normalizePath(String path) {
        return "/" + (path == null ? "" : path)
                .replace('\\', '/')
                .replaceAll("/+", "/")
                .toLowerCase(Locale.US);
    }

    private boolean isLikelyVideoName(String fileName) {
        String name = fileName == null ? "" : fileName.toLowerCase(Locale.US);
        for (String extension : VIDEO_EXTENSIONS) {
            if (name.endsWith(extension)) return true;
        }
        return false;
    }

    private boolean isLikelyVideoFile(File file) {
        if (file == null || !file.isFile() || file.length() <= 0L) return false;
        return isLikelyVideoName(file.getName());
    }

    private VideoInput openVideoInput(String source, String fileName, String mimeType) throws Exception {
        return openVideoInput(source, fileName, mimeType, true);
    }

    private VideoInput openVideoInput(String source, String fileName, String mimeType, boolean remuxTransportStreams) throws Exception {
        Uri uri = source.startsWith("/") ? null : Uri.parse(source);
        String name = fileName == null || fileName.trim().length() == 0 ? "" : fileName.trim();
        String type = mimeType == null || mimeType.trim().length() == 0 ? "" : mimeType.trim();

        if (uri != null && "content".equalsIgnoreCase(uri.getScheme())) {
            long size = resolveContentSize(uri);
            if (name.length() == 0) name = resolveContentName(uri);
            if (name.length() == 0) name = "replay-video.mp4";
            if (type.length() == 0) type = guessVideoMime(name);
            if (remuxTransportStreams && (isTransportStreamName(name) || isTransportStreamMime(type))) {
                File cachedSource = copyContentVideoToCache(uri, name);
                File mp4File = remuxTransportStreamToMp4(cachedSource, name);
                return new VideoInput(new FileInputStream(mp4File), toMp4FileName(name), "video/mp4", mp4File.length());
            }
            InputStream input = activity.getContentResolver().openInputStream(uri);
            if (input == null) throw new IllegalStateException("無法讀取本機影片。");
            return new VideoInput(input, name, type, size);
        }

        File file;
        if (uri != null && "file".equalsIgnoreCase(uri.getScheme())) {
            file = new File(uri.getPath());
        } else {
            file = new File(source);
        }
        if (!file.exists() || !file.isFile()) {
            throw new IllegalStateException("找不到本機影片檔案。");
        }
        if (name.length() == 0) name = file.getName();
        if (type.length() == 0) type = guessVideoMime(name);
        if (remuxTransportStreams && (isTransportStreamName(file.getName()) || (isTransportStreamName(name) && isTransportStreamMime(type)))) {
            File mp4File = remuxTransportStreamToMp4(file, name);
            return new VideoInput(new FileInputStream(mp4File), toMp4FileName(name), "video/mp4", mp4File.length());
        }
        return new VideoInput(new FileInputStream(file), name, type, file.length());
    }

    private PreparedVideo preparePlayableVideo(String source, String fileName, String mimeType) throws Exception {
        return preparePlayableVideo(source, fileName, mimeType, null);
    }

    private void runPrepareLocalVideo(VideoPrepareTask task, String source, String fileName, String mimeType) {
        try {
            task.status = "running";
            task.progress = 1;
            task.message = "Preparing video...";
            PreparedVideo prepared = preparePlayableVideo(source, fileName, mimeType, task);
            task.uri = prepared.uri;
            task.fileName = prepared.fileName;
            task.mimeType = prepared.mimeType;
            task.size = prepared.size;
            task.converted = prepared.converted;
            task.indeterminate = false;
            task.progress = 100;
            task.status = "done";
            task.message = prepared.converted ? "MP4 is ready." : "Video is ready.";
        } catch (Exception error) {
            task.indeterminate = false;
            task.progress = 100;
            task.status = "failed";
            task.message = safeMessage(error);
        }
    }

    private PreparedVideo preparePlayableVideo(String source, String fileName, String mimeType, VideoPrepareTask task) throws Exception {
        Uri uri = source.startsWith("/") ? null : Uri.parse(source);
        String name = fileName == null || fileName.trim().length() == 0 ? "" : fileName.trim();
        String type = mimeType == null || mimeType.trim().length() == 0 ? "" : mimeType.trim();

        if (uri != null && "content".equalsIgnoreCase(uri.getScheme())) {
            if (name.length() == 0) name = resolveContentName(uri);
            if (name.length() == 0) name = "replay-video.mp4";
            if (type.length() == 0) type = guessVideoMime(name);
            if (needsPhoneSaveRemux(name, type)) {
                File cachedSource = copyContentVideoToCache(uri, name, task);
                File mp4File = remuxTransportStreamToMp4(cachedSource, name, task);
                return new PreparedVideo(Uri.fromFile(mp4File).toString(), toMp4FileName(name), "video/mp4", mp4File.length(), true);
            }
            long size = resolveContentSize(uri);
            return new PreparedVideo(source, name, type, size, false);
        }

        File file;
        if (uri != null && "file".equalsIgnoreCase(uri.getScheme())) {
            file = new File(uri.getPath());
        } else {
            file = new File(source);
        }
        if (!file.exists() || !file.isFile()) {
            throw new IllegalStateException("Local video file was not found.");
        }
        if (name.length() == 0) name = file.getName();
        if (type.length() == 0) type = guessVideoMime(name);
        if (needsPhoneSaveRemux(name, type) || needsPhoneSaveRemux(file.getName(), type)) {
            File mp4File = remuxTransportStreamToMp4(file, name, task);
            return new PreparedVideo(Uri.fromFile(mp4File).toString(), toMp4FileName(name), "video/mp4", mp4File.length(), true);
        }
        return new PreparedVideo(Uri.fromFile(file).toString(), name, type, file.length(), false);
    }

    private File copyContentVideoToCache(Uri uri, String fileName) throws Exception {
        return copyContentVideoToCache(uri, fileName, null);
    }

    private File copyContentVideoToCache(Uri uri, String fileName, VideoPrepareTask task) throws Exception {
        File dir = remuxCacheDir();
        String safeName = safeFileName(fileName == null || fileName.trim().length() == 0 ? "replay-video.ts" : fileName.trim());
        File outFile = new File(dir, System.currentTimeMillis() + "-" + safeName);
        long size = resolveContentSize(uri);
        if (task != null) {
            task.message = "Reading video...";
            task.progress = 3;
            task.indeterminate = size <= 0L;
        }
        try (InputStream input = activity.getContentResolver().openInputStream(uri);
             FileOutputStream output = new FileOutputStream(outFile)) {
            if (input == null) throw new IllegalStateException("Unable to read the selected video.");
            byte[] buffer = new byte[64 * 1024];
            int read;
            long total = 0L;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                total += read;
                if (task != null && size > 0L) {
                    task.progress = Math.min(18, 3 + (int) ((total * 15L) / size));
                }
            }
        }
        if (outFile.length() <= 0) {
            throw new IllegalStateException("The selected video is empty.");
        }
        if (task != null) {
            task.indeterminate = false;
            task.progress = Math.max(task.progress, 18);
        }
        return outFile;
    }

    private File remuxTransportStreamToMp4(File source, String displayName) throws Exception {
        return remuxTransportStreamToMp4(source, displayName, null);
    }

    private File remuxTransportStreamToMp4(File source, String displayName, VideoPrepareTask task) throws Exception {
        if (source == null || !source.exists() || !source.isFile()) {
            throw new IllegalStateException("Video source file was not found.");
        }

        File dir = remuxCacheDir();
        File output = new File(dir, System.currentTimeMillis() + "-" + safeFileName(toMp4FileName(displayName)));
        MediaExtractor extractor = new MediaExtractor();
        MediaMuxer muxer = null;
        boolean muxerStarted = false;
        try {
            extractor.setDataSource(source.getAbsolutePath());
            int trackCount = extractor.getTrackCount();
            int[] trackMap = new int[trackCount];
            for (int i = 0; i < trackMap.length; i += 1) {
                trackMap[i] = -1;
            }

            muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            boolean hasVideo = false;
            boolean hasAudio = false;
            int selectedTracks = 0;
            int maxInputSize = 4 * 1024 * 1024;
            long durationUs = -1L;
            for (int i = 0; i < trackCount; i += 1) {
                MediaFormat format = extractor.getTrackFormat(i);
                String mime = format.containsKey(MediaFormat.KEY_MIME) ? format.getString(MediaFormat.KEY_MIME) : "";
                if (!isSupportedMp4Track(mime, hasVideo, hasAudio)) continue;
                int outputTrack;
                try {
                    outputTrack = muxer.addTrack(format);
                } catch (Exception unsupportedTrack) {
                    continue;
                }
                trackMap[i] = outputTrack;
                extractor.selectTrack(i);
                selectedTracks += 1;
                if (mime.startsWith("video/")) hasVideo = true;
                if (mime.startsWith("audio/")) hasAudio = true;
                if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                    maxInputSize = Math.max(maxInputSize, format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE));
                }
                if (format.containsKey(MediaFormat.KEY_DURATION)) {
                    durationUs = Math.max(durationUs, format.getLong(MediaFormat.KEY_DURATION));
                }
            }

            if (!hasVideo || selectedTracks == 0) {
                throw new IllegalStateException("No MP4-compatible video track was found in this file.");
            }

            maxInputSize = Math.max(1024 * 1024, Math.min(maxInputSize, 32 * 1024 * 1024));
            ByteBuffer buffer = ByteBuffer.allocate(maxInputSize);
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            muxer.start();
            muxerStarted = true;
            long writtenSamples = 0L;
            long lastProgressAt = 0L;
            if (task != null) {
                task.message = "Converting video to MP4...";
                task.indeterminate = durationUs <= 0L;
                task.progress = Math.max(task.progress, 20);
            }

            while (true) {
                int trackIndex = extractor.getSampleTrackIndex();
                if (trackIndex < 0) break;
                int outputTrack = trackIndex < trackMap.length ? trackMap[trackIndex] : -1;
                if (outputTrack < 0) {
                    extractor.advance();
                    continue;
                }

                buffer.clear();
                int sampleSize = extractor.readSampleData(buffer, 0);
                if (sampleSize < 0) break;
                long sampleTime = extractor.getSampleTime();
                int sampleFlags = extractor.getSampleFlags();
                int bufferFlags = (sampleFlags & MediaExtractor.SAMPLE_FLAG_SYNC) != 0
                        ? MediaCodec.BUFFER_FLAG_KEY_FRAME
                        : 0;
                info.set(0, sampleSize, Math.max(0L, sampleTime), bufferFlags);
                muxer.writeSampleData(outputTrack, buffer, info);
                writtenSamples += 1L;
                if (task != null && durationUs > 0L && sampleTime >= 0L) {
                    long now = System.currentTimeMillis();
                    if (now - lastProgressAt > 250L) {
                        int progress = 20 + (int) Math.min(75L, (sampleTime * 75L) / durationUs);
                        task.progress = Math.max(task.progress, Math.min(95, progress));
                        lastProgressAt = now;
                    }
                }
                extractor.advance();
            }
            if (writtenSamples == 0L) {
                throw new IllegalStateException("No playable samples were found in this file.");
            }
            muxer.stop();
            muxerStarted = false;
            if (task != null) {
                task.indeterminate = false;
                task.progress = Math.max(task.progress, 96);
            }
        } catch (Exception error) {
            if (output.exists()) {
                //noinspection ResultOfMethodCallIgnored
                output.delete();
            }
            throw new IllegalStateException("Unable to prepare video as MP4: " + safeMessage(error), error);
        } finally {
            if (muxer != null) {
                try {
                    if (muxerStarted) muxer.stop();
                } catch (Exception ignored) {
                    // The primary error, if any, was already captured above.
                }
                try {
                    muxer.release();
                } catch (Exception ignored) {
                    // Release best effort.
                }
            }
            extractor.release();
        }

        if (output.length() <= 0) {
            throw new IllegalStateException("Prepared MP4 file is empty.");
        }
        return output;
    }

    private File remuxCacheDir() throws Exception {
        File dir = new File(activity.getCacheDir(), "replay-remux");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IllegalStateException("Unable to create replay video cache.");
        }
        cleanOldFiles(dir, 24L * 60L * 60L * 1000L);
        return dir;
    }

    private void cleanOldFiles(File dir, long maxAgeMillis) {
        File[] files = dir.listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - maxAgeMillis;
        for (File file : files) {
            if (file.isFile() && file.lastModified() < cutoff) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
        }
    }

    private boolean isTransportStreamName(String fileName) {
        String value = fileName == null ? "" : fileName.toLowerCase(Locale.US);
        return value.endsWith(".ts") || value.endsWith(".mts") || value.endsWith(".m2ts");
    }

    private boolean isTransportStreamMime(String mimeType) {
        String value = mimeType == null ? "" : mimeType.toLowerCase(Locale.US);
        return value.equals("video/mp2t")
                || value.equals("video/mpeg")
                || value.equals("video/mpeg2")
                || value.equals("application/x-mpegurl");
    }

    private boolean isQuickTimeName(String fileName) {
        String value = fileName == null ? "" : fileName.toLowerCase(Locale.US);
        return value.endsWith(".mov");
    }

    private boolean isQuickTimeMime(String mimeType) {
        String value = mimeType == null ? "" : mimeType.toLowerCase(Locale.US);
        return value.equals("video/quicktime");
    }

    private boolean isSupportedMp4Track(String mimeType, boolean hasVideo, boolean hasAudio) {
        String value = mimeType == null ? "" : mimeType.toLowerCase(Locale.US);
        if (value.startsWith("video/")) {
            return !hasVideo && (
                    value.equals("video/avc")
                            || value.equals("video/hevc")
                            || value.equals("video/mp4v-es")
                            || value.equals("video/3gpp")
            );
        }
        if (value.startsWith("audio/")) {
            return !hasAudio && (
                    value.equals("audio/mp4a-latm")
                            || value.equals("audio/3gpp")
                            || value.equals("audio/amr-wb")
            );
        }
        return false;
    }

    private String toMp4FileName(String fileName) {
        String value = fileName == null || fileName.trim().length() == 0 ? "replay-video" : fileName.trim();
        int dot = value.lastIndexOf('.');
        if (dot > 0) value = value.substring(0, dot);
        if (value.length() == 0) value = "replay-video";
        return value + ".mp4";
    }

    private String safeMessage(Exception error) {
        String message = error.getMessage();
        return message == null || message.length() == 0 ? error.toString() : message;
    }

    private long resolveContentSize(Uri uri) {
        try (Cursor cursor = activity.getContentResolver().query(
                uri,
                new String[] { OpenableColumns.SIZE },
                null,
                null,
                null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                return getCursorLong(cursor, OpenableColumns.SIZE, -1L);
            }
        } catch (Exception ignored) {
            // Unknown size is acceptable for chunked upload.
        }
        return -1L;
    }

    private String resolveContentName(Uri uri) {
        try (Cursor cursor = activity.getContentResolver().query(
                uri,
                new String[] { OpenableColumns.DISPLAY_NAME },
                null,
                null,
                null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                return getCursorString(cursor, OpenableColumns.DISPLAY_NAME, "");
            }
        } catch (Exception ignored) {
            // Fallback below.
        }
        return "";
    }

    private String uploadVideoToEndpoint(VideoInput video, String endpoint, String mode, String token, VideoUploadTask task) throws Exception {
        String uploadUrl = resolveUploadEndpoint(endpoint, video.fileName);
        if ("POST".equalsIgnoreCase(mode)) {
            return uploadMultipart(uploadUrl, video, token, task);
        }
        return uploadBinary(uploadUrl, video, token, task);
    }

    private String uploadBinary(String uploadUrl, VideoInput video, String token) throws Exception {
        return uploadBinary(uploadUrl, video, token, null);
    }

    private String uploadBinary(String uploadUrl, VideoInput video, String token, VideoUploadTask task) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(uploadUrl).openConnection();
        connection.setRequestMethod("PUT");
        connection.setDoOutput(true);
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(180000);
        connection.setUseCaches(false);
        connection.setRequestProperty("Content-Type", video.mimeType);
        connection.setRequestProperty("Connection", "Keep-Alive");
        applyAuth(connection, token);
        if (video.size >= 0L) {
            connection.setFixedLengthStreamingMode(video.size);
        } else {
            connection.setChunkedStreamingMode(FAST_UPLOAD_BUFFER_SIZE);
        }
        try (OutputStream output = connection.getOutputStream()) {
            copyUploadStream(video.input, output, task, video.size);
        }
        return readHttpResponse(connection);
    }

    private String uploadMultipart(String uploadUrl, VideoInput video, String token) throws Exception {
        return uploadMultipart(uploadUrl, video, token, null);
    }

    private String uploadMultipart(String uploadUrl, VideoInput video, String token, VideoUploadTask task) throws Exception {
        String boundary = "ShenYueBoundary" + System.currentTimeMillis();
        HttpURLConnection connection = (HttpURLConnection) new URL(uploadUrl).openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(180000);
        connection.setUseCaches(false);
        connection.setRequestProperty("Connection", "Keep-Alive");
        byte[] headBytes = ("--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"" + video.fileName.replace("\"", "_") + "\"\r\n"
                + "Content-Type: " + video.mimeType + "\r\n\r\n").getBytes("UTF-8");
        byte[] tailBytes = ("\r\n--" + boundary + "--\r\n").getBytes("UTF-8");
        if (video.size >= 0L) {
            connection.setFixedLengthStreamingMode(headBytes.length + video.size + tailBytes.length);
        } else {
            connection.setChunkedStreamingMode(FAST_UPLOAD_BUFFER_SIZE);
        }
        connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
        applyAuth(connection, token);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(headBytes);
            copyUploadStream(video.input, output, task, video.size);
            output.write(tailBytes);
        }
        return readHttpResponse(connection);
    }

    private void applyAuth(HttpURLConnection connection, String token) {
        String safeToken = token == null ? "" : token.trim();
        if (safeToken.length() > 0) {
            connection.setRequestProperty("Authorization", "Bearer " + safeToken);
        }
    }

    private String readHttpResponse(HttpURLConnection connection) throws Exception {
        int code = connection.getResponseCode();
        InputStream input = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
        String body = "";
        if (input != null) {
            try (InputStream response = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                copyStream(response, output);
                body = output.toString("UTF-8");
            }
        }
        connection.disconnect();
        if (code < 200 || code >= 300) {
            throw new IllegalStateException("上傳失敗，HTTP " + code + " " + body);
        }
        return body;
    }

    private JSONObject parseUploadResponse(String responseText) throws JSONException {
        String body = responseText == null ? "" : responseText.trim();
        if (body.startsWith("{")) {
            JSONObject object = new JSONObject(body);
            if (!object.has("ok")) object.put("ok", true);
            return object;
        }

        JSONObject object = new JSONObject();
        object.put("ok", true);
        object.put("responseText", body);
        if (body.startsWith("http://") || body.startsWith("https://")) {
            object.put("publicUrl", body);
        }
        return object;
    }

    private void copyStream(InputStream input, OutputStream output) throws Exception {
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = input.read(buffer)) != -1) {
            output.write(buffer, 0, read);
        }
    }

    private void copyUploadStream(InputStream input, OutputStream output, VideoUploadTask task, long totalSize) throws Exception {
        byte[] buffer = new byte[FAST_UPLOAD_BUFFER_SIZE];
        int read;
        long total = 0L;
        long lastUpdate = 0L;
        while ((read = input.read(buffer)) != -1) {
            output.write(buffer, 0, read);
            total += read;
            if (task != null) {
                long now = System.currentTimeMillis();
                if (now - lastUpdate >= UPLOAD_PROGRESS_INTERVAL_MS || (totalSize > 0L && total >= totalSize)) {
                    int progress;
                    if (totalSize > 0L) {
                        progress = Math.min(96, Math.max(3, 3 + (int) ((total * 93L) / totalSize)));
                    } else {
                        progress = Math.min(95, Math.max(task.progress + 1, 3));
                    }
                    task.progress = Math.max(task.progress, progress);
                    task.message = String.format(Locale.TAIWAN, "上傳中 %d%%", task.progress);
                    lastUpdate = now;
                }
            }
        }
        output.flush();
        if (task != null) {
            task.progress = Math.max(task.progress, 97);
            task.message = "上傳完成，等待伺服器回應 97%";
        }
    }

    private int ensureLocalVideoServer() throws Exception {
        synchronized (localVideoServerLock) {
            if (localVideoServer != null && !localVideoServer.isClosed()) {
                return localVideoServer.getLocalPort();
            }

            localVideoServer = new ServerSocket(0);
            localVideoServerThread = new Thread(() -> {
                while (localVideoServer != null && !localVideoServer.isClosed()) {
                    try {
                        Socket socket = localVideoServer.accept();
                        localVideoExecutor.execute(() -> handleLocalVideoClient(socket));
                    } catch (Exception ignored) {
                        // Server is closing or a client failed before dispatch.
                    }
                }
            }, "ShenYueLocalVideoServer");
            localVideoServerThread.setDaemon(true);
            localVideoServerThread.start();
            return localVideoServer.getLocalPort();
        }
    }

    private void handleLocalVideoClient(Socket socket) {
        try (Socket client = socket) {
            client.setSoTimeout(120000);
            InputStream input = client.getInputStream();
            BufferedOutputStream output = new BufferedOutputStream(client.getOutputStream());
            String request = readHttpRequest(input);
            if (request.length() == 0) return;

            String[] lines = request.split("\\r?\\n");
            String[] first = lines[0].split(" ");
            if (first.length < 2) {
                writeSimpleHttp(output, 400, "Bad Request", "text/plain; charset=utf-8", "Bad Request");
                return;
            }

            String method = first[0];
            if ("OPTIONS".equalsIgnoreCase(method)) {
                writeOptions(output);
                return;
            }
            if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) {
                writeSimpleHttp(output, 405, "Method Not Allowed", "text/plain; charset=utf-8", "Method Not Allowed");
                return;
            }

            String path = first[1];
            int pathQuery = path.indexOf('?');
            if (pathQuery >= 0) path = path.substring(0, pathQuery);

            boolean watchRequest = path.startsWith("/local-watch/");
            boolean statusRequest = path.startsWith("/local-status/");
            boolean originalRequest = path.startsWith("/local-video/");
            boolean playRequest = path.startsWith("/local-play/");
            boolean downloadRequest = path.startsWith("/local-download/");
            if (!watchRequest && !statusRequest && !originalRequest && !playRequest && !downloadRequest) {
                writeSimpleHttp(output, 404, "Not Found", "text/plain; charset=utf-8", "Not Found");
                return;
            }

            String prefix = watchRequest ? "/local-watch/"
                    : statusRequest ? "/local-status/"
                    : originalRequest ? "/local-video/"
                    : playRequest ? "/local-play/"
                    : "/local-download/";
            String token = tokenFromPath(path, prefix);

            LocalVideoShare share = resolveLocalVideoShare(token);
            if (share == null || share.expiresAt < System.currentTimeMillis()) {
                writeSimpleHttp(output, 404, "Not Found", "text/plain; charset=utf-8", "影片連結已失效。");
                return;
            }

            String rangeHeader = findHeader(lines, "Range");
            try {
                if (statusRequest) {
                    serveLocalShareStatus(output, method, share);
                    return;
                }
                if (watchRequest) {
                    serveLocalWatchPage(output, method, share);
                    return;
                }
                serveLocalVideo(output, method, share, rangeHeader, downloadRequest, playRequest || downloadRequest);
            } catch (Exception error) {
                writeSimpleHttp(
                        output,
                        500,
                        "Internal Server Error",
                        "text/plain; charset=utf-8",
                        "影片轉檔或讀取失敗：" + safeMessage(error)
                );
            }
        } catch (Exception ignored) {
            // Client disconnected or requested an invalid range.
        }
    }

    private String tokenFromPath(String path, String prefix) {
        String tokenPart = path.substring(prefix.length());
        int slash = tokenPart.indexOf('/');
        return slash >= 0 ? tokenPart.substring(0, slash) : tokenPart;
    }

    private LocalVideoShare resolveLocalVideoShare(String token) {
        if (token == null || token.length() == 0) return null;
        LocalVideoShare share = localVideoShares.get(token);
        if (share != null && share.expiresAt < System.currentTimeMillis()) {
            localVideoShares.remove(token);
            deletePreparedShareFile(share);
            return null;
        }
        return share;
    }

    private String readHttpRequest(InputStream input) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int matched = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            for (int i = 0; i < read; i++) {
                byte value = buffer[i];
                output.write(value);
                if ((matched == 0 && value == '\r')
                        || (matched == 1 && value == '\n')
                        || (matched == 2 && value == '\r')
                        || (matched == 3 && value == '\n')) {
                    matched += 1;
                    if (matched == 4) return output.toString("UTF-8");
                } else {
                    matched = value == '\r' ? 1 : 0;
                }
                if (output.size() > 8192) return output.toString("UTF-8");
            }
        }
        return output.toString("UTF-8");
    }

    private String findHeader(String[] lines, String name) {
        String prefix = name.toLowerCase(Locale.US) + ":";
        for (String line : lines) {
            String value = line == null ? "" : line.trim();
            if (value.toLowerCase(Locale.US).startsWith(prefix)) {
                return value.substring(prefix.length()).trim();
            }
        }
        return "";
    }

    private VideoInput openPhoneSaveVideoInput(LocalVideoShare share) throws Exception {
        beginPhoneSavePreparation(share);
        synchronized (share) {
            long deadline = System.currentTimeMillis() + 10L * 60L * 1000L;
            while (("queued".equals(share.prepareTask.status) || "running".equals(share.prepareTask.status))
                    && System.currentTimeMillis() < deadline) {
                share.wait(500L);
            }
            if (share.phoneSource.length() == 0) useOriginalVideoForPhone(share, "使用原始完整影片。", "");
        }
        return openVideoInput(share.phoneSource, share.phoneFileName, share.phoneMimeType, false);
    }

    private void serveLocalShareStatus(OutputStream output, String method, LocalVideoShare share) throws Exception {
        String body = localShareStatus(share).toString();
        writeHttpBody(output, "200 OK", "application/json; charset=utf-8", body, "HEAD".equalsIgnoreCase(method));
    }

    private void serveLocalWatchPage(OutputStream output, String method, LocalVideoShare share) throws Exception {
        beginPhoneSavePreparation(share);
        String originalName = normalizedVideoName(share.fileName);
        String saveName = phoneSaveFileName(share.fileName, share.mimeType);
        JSONObject boot = new JSONObject();
        boot.put("token", share.token);
        boot.put("fileName", saveName);
        boot.put("mimeType", needsPhoneSaveRemux(share.fileName, share.mimeType) ? "video/mp4" : share.mimeType);
        boot.put("size", share.size);
        boot.put("statusUrl", "/local-status/" + share.token);
        boot.put("downloadUrl", "/local-download/" + share.token + "/" + urlEncode(saveName));
        boot.put("originalUrl", "/local-video/" + share.token + "/" + urlEncode(originalName));
        boot.put("receiverUrl", share.receiverUrl);
        boot.put("expiresAt", share.expiresAt);

        String template = loadLocalWatchTemplate();
        String html = template.replace("__SHENYUE_BOOTSTRAP_JSON__", safeJsonForInlineScript(boot.toString()));
        writeHttpBody(output, "200 OK", "text/html; charset=utf-8", html, "HEAD".equalsIgnoreCase(method));
    }

    private String loadLocalWatchTemplate() throws Exception {
        try (InputStream input = activity.getAssets().open("replay-local-watch.html");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            copyStream(input, output);
            return output.toString("UTF-8");
        }
    }

    private String safeJsonForInlineScript(String value) {
        return value == null ? "{}" : value.replace("</", "<\\/");
    }

    private void serveLocalVideo(
            OutputStream output,
            String method,
            LocalVideoShare share,
            String rangeHeader,
            boolean attachment,
            boolean phoneCompatible
    ) throws Exception {
        VideoInput video = null;
        try {
            video = phoneCompatible
                    ? openPhoneSaveVideoInput(share)
                    : openVideoInput(share.source, share.fileName, share.mimeType, false);
            long size = video.size >= 0L ? video.size : share.size;
            long start = 0L;
            long end = size > 0L ? size - 1L : -1L;
            boolean partial = false;

            if (size > 0L && rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                String range = rangeHeader.substring("bytes=".length());
                int dash = range.indexOf('-');
                if (dash >= 0) {
                    String startText = range.substring(0, dash).trim();
                    String endText = range.substring(dash + 1).trim();
                    if (startText.length() > 0) start = Long.parseLong(startText);
                    if (endText.length() > 0) end = Math.min(size - 1L, Long.parseLong(endText));
                    if (start < 0L || start >= size || end < start) {
                        writeRangeNotSatisfiable(output, size);
                        return;
                    }
                    partial = true;
                }
            }

            long length = size > 0L ? end - start + 1L : -1L;
            StringBuilder headers = new StringBuilder();
            headers.append(partial ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
            headers.append("Content-Type: ").append(video.mimeType).append("\r\n");
            headers.append("Accept-Ranges: bytes\r\n");
            headers.append("Access-Control-Allow-Origin: *\r\n");
            headers.append("Cache-Control: no-store\r\n");
            headers.append("Connection: close\r\n");
            headers.append("Content-Disposition: ").append(contentDisposition(attachment, video.fileName)).append("\r\n");
            if (length >= 0L) headers.append("Content-Length: ").append(length).append("\r\n");
            if (partial) headers.append("Content-Range: bytes ").append(start).append("-").append(end).append("/").append(size).append("\r\n");
            headers.append("\r\n");
            output.write(headers.toString().getBytes("UTF-8"));
            if (!"HEAD".equalsIgnoreCase(method)) {
                skipFully(video.input, start);
                copyRange(video.input, output, length);
            }
            output.flush();
        } finally {
            if (video != null) {
                try {
                    video.input.close();
                } catch (Exception ignored) {
                    // Closing best effort.
                }
            }
        }
    }

    private String contentDisposition(boolean attachment, String fileName) throws Exception {
        String displayName = normalizedVideoName(fileName).replace("\r", "_").replace("\n", "_");
        String fallbackName = safeFileName(displayName);
        String encodedName = urlEncode(displayName);
        return (attachment ? "attachment" : "inline")
                + "; filename=\"" + fallbackName.replace("\"", "_") + "\""
                + "; filename*=UTF-8''" + encodedName;
    }

    private String urlEncode(String value) throws Exception {
        return URLEncoder.encode(value == null ? "" : value, "UTF-8").replace("+", "%20");
    }

    private void writeHttpBody(OutputStream output, String status, String contentType, String body, boolean headOnly) throws Exception {
        byte[] bodyBytes = body.getBytes("UTF-8");
        String headers = "HTTP/1.1 " + status + "\r\n"
                + "Content-Type: " + contentType + "\r\n"
                + "Content-Length: " + bodyBytes.length + "\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Cache-Control: no-store\r\n"
                + "Connection: close\r\n\r\n";
        output.write(headers.getBytes("UTF-8"));
        if (!headOnly) output.write(bodyBytes);
        output.flush();
    }

    private String htmlEscape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String jsStringEscape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("</", "<\\/");
    }

    private void writeRangeNotSatisfiable(OutputStream output, long size) throws Exception {
        String headers = "HTTP/1.1 416 Range Not Satisfiable\r\n"
                + "Content-Range: bytes */" + size + "\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Connection: close\r\n\r\n";
        output.write(headers.getBytes("UTF-8"));
        output.flush();
    }

    private void writeOptions(OutputStream output) throws Exception {
        String headers = "HTTP/1.1 204 No Content\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n"
                + "Access-Control-Allow-Headers: Range, Content-Type\r\n"
                + "Access-Control-Max-Age: 86400\r\n"
                + "Connection: close\r\n\r\n";
        output.write(headers.getBytes("UTF-8"));
        output.flush();
    }

    private void writeSimpleHttp(OutputStream output, int code, String status, String contentType, String body) throws Exception {
        byte[] bodyBytes = body.getBytes("UTF-8");
        String headers = "HTTP/1.1 " + code + " " + status + "\r\n"
                + "Content-Type: " + contentType + "\r\n"
                + "Content-Length: " + bodyBytes.length + "\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Connection: close\r\n\r\n";
        output.write(headers.getBytes("UTF-8"));
        output.write(bodyBytes);
        output.flush();
    }

    private void skipFully(InputStream input, long bytes) throws Exception {
        long remaining = bytes;
        while (remaining > 0L) {
            long skipped = input.skip(remaining);
            if (skipped <= 0L) {
                if (input.read() == -1) return;
                skipped = 1L;
            }
            remaining -= skipped;
        }
    }

    private void copyRange(InputStream input, OutputStream output, long length) throws Exception {
        byte[] buffer = new byte[FAST_UPLOAD_BUFFER_SIZE];
        if (length < 0L) {
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return;
        }

        long remaining = length;
        while (remaining > 0L) {
            int read = input.read(buffer, 0, (int) Math.min(buffer.length, remaining));
            if (read == -1) return;
            output.write(buffer, 0, read);
            remaining -= read;
        }
    }

    private String getLocalNetworkAddress() {
        String wifiAddress = getWifiAddress();
        if (wifiAddress.length() > 0) return wifiAddress;

        String firstPrivateAddress = "";
        String firstAddress = "";
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface networkInterface : interfaces) {
                if (!networkInterface.isUp() || networkInterface.isLoopback()) continue;
                List<InetAddress> addresses = Collections.list(networkInterface.getInetAddresses());
                for (InetAddress address : addresses) {
                    if (address instanceof Inet4Address && !address.isLoopbackAddress() && !address.isLinkLocalAddress()) {
                        String host = address.getHostAddress();
                        if (firstAddress.length() == 0) firstAddress = host;
                        if (address.isSiteLocalAddress() && firstPrivateAddress.length() == 0) firstPrivateAddress = host;
                        if (isPreferredLanAddress(host)) return host;
                    }
                }
            }
        } catch (Exception ignored) {
            // Fallback below.
        }
        if (firstPrivateAddress.length() > 0) return firstPrivateAddress;
        return firstAddress;
    }

    private String getWifiAddress() {
        try {
            WifiManager wifi = (WifiManager) activity.getApplicationContext().getSystemService(Activity.WIFI_SERVICE);
            if (wifi != null && wifi.getConnectionInfo() != null) {
                int ip = wifi.getConnectionInfo().getIpAddress();
                if (ip != 0) {
                    return String.format(
                            Locale.US,
                            "%d.%d.%d.%d",
                            ip & 0xff,
                            (ip >> 8) & 0xff,
                            (ip >> 16) & 0xff,
                            (ip >> 24) & 0xff
                    );
                }
            }
        } catch (Exception ignored) {
            // No Wi-Fi IP available.
        }
        return "";
    }

    private boolean isPreferredLanAddress(String host) {
        if (host == null) return false;
        return host.startsWith("192.168.")
                || host.startsWith("10.")
                || host.matches("^172\\.(1[6-9]|2[0-9]|3[0-1])\\..*");
    }

    private String resolveUploadEndpoint(String endpoint, String fileName) throws Exception {
        String encoded = URLEncoder.encode(fileName == null ? "replay-video.mp4" : fileName, "UTF-8").replace("+", "%20");
        return endpoint.replace("{filename}", encoded);
    }

    private String guessVideoMime(String fileName) {
        String value = fileName == null ? "" : fileName.toLowerCase(Locale.US);
        if (value.endsWith(".mov")) return "video/quicktime";
        if (value.endsWith(".webm")) return "video/webm";
        if (value.endsWith(".mkv")) return "video/x-matroska";
        if (value.endsWith(".avi")) return "video/x-msvideo";
        if (value.endsWith(".ts") || value.endsWith(".mts") || value.endsWith(".m2ts")) return "video/mp2t";
        if (value.endsWith(".3gp")) return "video/3gpp";
        if (value.endsWith(".3g2")) return "video/3gpp2";
        if (value.endsWith(".dav") || value.endsWith(".264") || value.endsWith(".h264")
                || value.endsWith(".hevc") || value.endsWith(".h265")) return "application/octet-stream";
        return "video/mp4";
    }

    private String getCursorString(Cursor cursor, String column, String fallback) {
        int index = cursor.getColumnIndex(column);
        if (index < 0 || cursor.isNull(index)) return fallback;
        String value = cursor.getString(index);
        return value == null || value.length() == 0 ? fallback : value;
    }

    private long getCursorLong(Cursor cursor, String column, long fallback) {
        int index = cursor.getColumnIndex(column);
        if (index < 0 || cursor.isNull(index)) return fallback;
        return cursor.getLong(index);
    }

    private File copySelectedApkToCache(Uri uri, String fileName) throws Exception {
        File dir = new File(activity.getCacheDir(), "inspect-apks");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IllegalStateException("無法建立 APK 讀取暫存資料夾。");
        }

        String safeName = safeFileName(fileName == null || fileName.trim().length() == 0 ? "selected.apk" : fileName.trim());
        if (!safeName.toLowerCase(Locale.US).endsWith(".apk")) {
            safeName = safeName + ".apk";
        }
        File outFile = new File(dir, safeName);

        try (InputStream input = activity.getContentResolver().openInputStream(uri);
             FileOutputStream output = new FileOutputStream(outFile)) {
            if (input == null) {
                throw new IllegalStateException("無法讀取選擇的 APK 檔案。");
            }
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
        }

        if (outFile.length() <= 0) {
            throw new IllegalStateException("選擇的 APK 檔案是空的。");
        }
        return outFile;
    }

    private JSONObject inspectApkFile(File apkFile) throws Exception {
        JSONObject result = new JSONObject();
        PackageInfo info = packageManager.getPackageArchiveInfo(apkFile.getAbsolutePath(), 0);
        if (info == null || info.applicationInfo == null) {
            result.put("ok", false);
            result.put("message", "Android 無法解析這個 APK。");
            return result;
        }

        ApplicationInfo appInfo = info.applicationInfo;
        appInfo.sourceDir = apkFile.getAbsolutePath();
        appInfo.publicSourceDir = apkFile.getAbsolutePath();

        result.put("ok", true);
        result.put("packageName", info.packageName == null ? "" : info.packageName);
        result.put("versionName", info.versionName == null ? "" : info.versionName);
        result.put("versionCode", getVersionCode(info));
        result.put("targetSdk", appInfo.targetSdkVersion);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            result.put("minSdk", appInfo.minSdkVersion);
        }
        CharSequence label = appInfo.loadLabel(packageManager);
        result.put("appName", label == null ? "" : label.toString());
        result.put("sha256", sha256(apkFile));

        try {
            Drawable icon = appInfo.loadIcon(packageManager);
            String iconDataUrl = drawableToDataUrl(icon);
            if (iconDataUrl.length() > 0) {
                result.put("iconDataUrl", iconDataUrl);
            }
        } catch (Exception ignored) {
            // Icon extraction is optional; metadata is still useful.
        }
        return result;
    }

    private String drawableToDataUrl(Drawable drawable) {
        if (drawable == null) return "";
        int width = drawable.getIntrinsicWidth() > 0 ? drawable.getIntrinsicWidth() : 128;
        int height = drawable.getIntrinsicHeight() > 0 ? drawable.getIntrinsicHeight() : 128;
        width = Math.max(1, Math.min(width, 256));
        height = Math.max(1, Math.min(height, 256));

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, width, height);
        drawable.draw(canvas);

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 95, output);
        bitmap.recycle();
        return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
    }

    private String createQrDataUrl(String value) throws Exception {
        if (value == null || value.length() == 0) return "";
        int size = 640;
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, 2);
        BitMatrix matrix = new QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, size, size, hints);
        int[] pixels = new int[size * size];
        for (int y = 0; y < size; y += 1) {
            int offset = y * size;
            for (int x = 0; x < size; x += 1) {
                pixels[offset + x] = matrix.get(x, y) ? 0xff071018 : 0xffffffff;
            }
        }
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        bitmap.setPixels(pixels, 0, size, 0, 0, size, size);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output);
        bitmap.recycle();
        return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
    }

    private void runDownloadAndInstall(UpdateTask task, JSONObject item) {
        try {
            task.status = "downloading";
            task.message = "正在下載 APK...";
            File apkFile = downloadApk(task, item);

            String expectedSha256 = item.optString("sha256", "").trim();
            if (expectedSha256.length() > 0) {
                task.status = "verifying";
                task.message = "正在驗證 SHA-256...";
                String actualSha256 = sha256(apkFile);
                if (!expectedSha256.equalsIgnoreCase(actualSha256)) {
                    task.fail("SHA-256 不一致，已停止安裝。");
                    return;
                }
            }

            task.status = "installing";
            task.progress = 100;
            task.message = "下載完成，正在開啟 Android 安裝確認。";
            installApk(task, apkFile);
        } catch (Exception error) {
            task.fail(error.getMessage() == null ? error.toString() : error.getMessage());
        }
    }

    private File downloadApk(UpdateTask task, JSONObject item) throws Exception {
        String apkUrl = item.getString("apkUrl");
        HttpURLConnection connection = openConnection(apkUrl);
        int responseCode = connection.getResponseCode();
        if (responseCode < 200 || responseCode >= 300) {
            throw new IllegalStateException("下載失敗，HTTP " + responseCode);
        }

        int contentLength = connection.getContentLength();
        File downloadDir = new File(activity.getExternalFilesDir(null), "update-apks");
        if (!downloadDir.exists() && !downloadDir.mkdirs()) {
            throw new IllegalStateException("無法建立下載資料夾。");
        }

        String fileName = safeFileName(item.optString("name", task.packageName)) + "-" + item.optLong("versionCode", System.currentTimeMillis()) + ".apk";
        File outFile = new File(downloadDir, fileName);

        try (InputStream input = connection.getInputStream();
             FileOutputStream output = new FileOutputStream(outFile)) {
            byte[] buffer = new byte[64 * 1024];
            long total = 0L;
            int read;
            long lastUiUpdate = 0L;

            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                total += read;
                if (contentLength > 0) {
                    int progress = Math.min(99, (int) ((total * 100L) / contentLength));
                    long now = System.currentTimeMillis();
                    if (progress != task.progress && now - lastUiUpdate > 350L) {
                        task.progress = progress;
                        task.message = String.format(Locale.TAIWAN, "下載中 %d%%", progress);
                        lastUiUpdate = now;
                    }
                }
            }
        } finally {
            connection.disconnect();
        }

        if (outFile.length() <= 0) {
            throw new IllegalStateException("下載檔案為空，已停止安裝。");
        }

        return outFile;
    }

    private HttpURLConnection openConnection(String apkUrl) throws Exception {
        URL url = new URL(apkUrl);
        for (int redirect = 0; redirect < 8; redirect++) {
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setRequestProperty("User-Agent", "ShenYueUpdater/2.1");
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");
            int code = connection.getResponseCode();
            if (code == HttpURLConnection.HTTP_MOVED_PERM
                    || code == HttpURLConnection.HTTP_MOVED_TEMP
                    || code == HttpURLConnection.HTTP_SEE_OTHER
                    || code == 307
                    || code == 308) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null || location.length() == 0) {
                    throw new IllegalStateException("下載重新導向缺少 Location。");
                }
                url = new URL(url, location);
                continue;
            }
            return connection;
        }
        throw new IllegalStateException("下載重新導向次數過多。");
    }

    private void installApk(UpdateTask task, File apkFile) throws Exception {
        PackageInstaller installer = packageManager.getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(task.packageName);

        int sessionId = installer.createSession(params);
        PackageInstaller.Session session = installer.openSession(sessionId);
        try (OutputStream output = session.openWrite("base.apk", 0, apkFile.length());
             FileInputStream input = new FileInputStream(apkFile)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            session.fsync(output);
        }

        Intent callback = new Intent(activity, InstallStatusReceiver.class);
        callback.setAction(ACTION_INSTALL_COMMIT);
        callback.putExtra("taskId", task.id);
        callback.putExtra("appName", task.appName);
        callback.putExtra("packageName", task.packageName);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(activity, sessionId, callback, flags);
        session.commit(pendingIntent.getIntentSender());
        session.close();

        task.status = "installing";
        task.message = "已送出安裝請求，請依畫面確認。";
        writeLastStatus(task.appName + " 已送出安裝請求，請依畫面確認。");
    }

    private boolean canRequestPackageInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls();
    }

    private InstalledInfo getInstalled(String packageName) {
        try {
            PackageInfo info = packageManager.getPackageInfo(packageName, 0);
            return new InstalledInfo(true, info.versionName == null ? "" : info.versionName, getVersionCode(info));
        } catch (Exception ignored) {
            return new InstalledInfo(false, "", 0L);
        }
    }

    private long getVersionCode(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return info.getLongVersionCode();
        }
        return info.versionCode;
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }

        StringBuilder output = new StringBuilder();
        for (byte value : digest.digest()) {
            output.append(String.format(Locale.US, "%02x", value));
        }
        return output.toString();
    }

    private String safeFileName(String value) {
        String cleaned = value.replaceAll("[^A-Za-z0-9._-]", "_");
        return cleaned.length() == 0 ? "shen-yue-update" : cleaned;
    }

    private SharedPreferences getPrefs() {
        return activity.getSharedPreferences(PREFS_NAME, Activity.MODE_PRIVATE);
    }

    private void writeLastStatus(String message) {
        getPrefs().edit().putString(LAST_INSTALL_STATUS, message).apply();
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
    }

    private void putError(JSONObject object, Exception error) {
        try {
            object.put("ok", false);
            object.put("message", error.getMessage() == null ? error.toString() : error.getMessage());
        } catch (JSONException ignored) {
            // JSON error while reporting another error.
        }
    }

    private static class PreparedVideo {
        final String uri;
        final String fileName;
        final String mimeType;
        final long size;
        final boolean converted;

        PreparedVideo(String uri, String fileName, String mimeType, long size, boolean converted) {
            this.uri = uri;
            this.fileName = fileName;
            this.mimeType = mimeType;
            this.size = size;
            this.converted = converted;
        }
    }

    private static class LocalVideoScanTask {
        final String id;
        volatile String status = "queued";
        volatile int progress = 0;
        volatile String message = "等待掃描";
        volatile JSONArray items = new JSONArray();
        volatile JSONArray scanRoots = new JSONArray();
        volatile int count = 0;
        volatile String scanPaths = "";
        volatile boolean scanTruncated = false;
        volatile int scanLimit = LOCAL_VIDEO_SCAN_LIMIT;

        LocalVideoScanTask(String id) {
            this.id = id;
        }

        void complete(JSONObject result) {
            boolean ok = result.optBoolean("ok", false);
            status = ok ? "done" : "failed";
            progress = ok ? 100 : 0;
            message = ok
                    ? "掃描完成，找到 " + result.optInt("count", 0) + " 個影片。"
                    : result.optString("message", "掃描失敗");
            items = result.optJSONArray("items");
            if (items == null) items = new JSONArray();
            scanRoots = result.optJSONArray("scanRoots");
            if (scanRoots == null) scanRoots = new JSONArray();
            count = result.optInt("count", items.length());
            scanPaths = result.optString("scanPaths", "");
            scanTruncated = result.optBoolean("scanTruncated", false);
            scanLimit = result.optInt("scanLimit", LOCAL_VIDEO_SCAN_LIMIT);
        }

        void fail(String errorMessage) {
            status = "failed";
            progress = 0;
            message = errorMessage == null || errorMessage.length() == 0 ? "掃描失敗" : errorMessage;
        }

        JSONObject toJson() {
            JSONObject object = new JSONObject();
            try {
                object.put("ok", true);
                object.put("taskId", id);
                object.put("status", status);
                object.put("progress", progress);
                object.put("message", message);
                object.put("items", items);
                object.put("count", count);
                object.put("scanRoots", scanRoots);
                if (scanPaths.length() > 0) object.put("scanPaths", scanPaths);
                object.put("scanTruncated", scanTruncated);
                object.put("scanLimit", scanLimit);
            } catch (JSONException ignored) {
                // In-memory values are simple JSON-compatible values.
            }
            return object;
        }
    }

    private static class VideoPrepareTask {
        final String id;
        volatile String status = "queued";
        volatile int progress = 0;
        volatile boolean indeterminate = false;
        volatile String message = "Waiting to prepare video.";
        volatile String uri = "";
        volatile String fileName = "";
        volatile String mimeType = "";
        volatile long size = 0L;
        volatile boolean converted = false;

        VideoPrepareTask(String id) {
            this.id = id;
        }

        JSONObject toJson() {
            JSONObject object = new JSONObject();
            try {
                object.put("ok", true);
                object.put("taskId", id);
                object.put("status", status);
                object.put("progress", progress);
                object.put("indeterminate", indeterminate);
                object.put("message", message);
                object.put("uri", uri);
                object.put("fileName", fileName);
                object.put("mimeType", mimeType);
                object.put("size", size);
                object.put("converted", converted);
            } catch (JSONException ignored) {
                // In-memory values are simple strings and numbers.
            }
            return object;
        }
    }

    private static class VideoUploadTask {
        final String id;
        volatile String status = "queued";
        volatile int progress = 0;
        volatile String message = "等待上傳 0%";
        volatile String fileName = "";
        volatile String mimeType = "";
        volatile long size = 0L;
        volatile String publicUrl = "";
        volatile String shareUrl = "";
        volatile String url = "";
        volatile String storageKey = "";
        volatile String responseText = "";

        VideoUploadTask(String id) {
            this.id = id;
        }

        void complete(JSONObject uploadResult, VideoInput video) {
            status = "done";
            progress = 100;
            message = "上傳完成 100%";
            fileName = uploadResult.optString("fileName", video.fileName);
            mimeType = uploadResult.optString("mimeType", video.mimeType);
            size = uploadResult.optLong("size", video.size);
            publicUrl = uploadResult.optString("publicUrl", "");
            shareUrl = uploadResult.optString("shareUrl", "");
            url = uploadResult.optString("url", "");
            storageKey = uploadResult.optString("storageKey", "");
            responseText = uploadResult.optString("responseText", "");
        }

        void fail(String errorMessage) {
            status = "failed";
            progress = Math.max(progress, 0);
            message = errorMessage == null || errorMessage.length() == 0 ? "上傳失敗" : errorMessage;
        }

        JSONObject toJson() {
            JSONObject object = new JSONObject();
            try {
                object.put("ok", true);
                object.put("taskId", id);
                object.put("status", status);
                object.put("progress", progress);
                object.put("message", message);
                object.put("fileName", fileName);
                object.put("mimeType", mimeType);
                object.put("size", size);
                if (publicUrl.length() > 0) object.put("publicUrl", publicUrl);
                if (shareUrl.length() > 0) object.put("shareUrl", shareUrl);
                if (url.length() > 0) object.put("url", url);
                if (storageKey.length() > 0) object.put("storageKey", storageKey);
                if (responseText.length() > 0) object.put("responseText", responseText);
            } catch (JSONException ignored) {
                // In-memory values are simple strings and numbers.
            }
            return object;
        }
    }

    private static class LocalVideoShare {
        final String token;
        final String source;
        final String fileName;
        final String mimeType;
        final long size;
        final long expiresAt;
        final VideoPrepareTask prepareTask;
        volatile boolean prepareStarted = false;
        volatile String prepareWarning = "";
        volatile String receiverUrl = "";
        volatile String phoneSource = "";
        volatile String phoneFileName = "";
        volatile String phoneMimeType = "";
        volatile long phoneSize = -1L;

        LocalVideoShare(String token, String source, String fileName, String mimeType, long size, long expiresAt) {
            this.token = token;
            this.source = source;
            this.fileName = fileName;
            this.mimeType = mimeType;
            this.size = size;
            this.expiresAt = expiresAt;
            this.prepareTask = new VideoPrepareTask("share-prepare-" + token);
        }
    }

    private static class VideoInput {
        final InputStream input;
        final String fileName;
        final String mimeType;
        final long size;

        VideoInput(InputStream input, String fileName, String mimeType, long size) {
            this.input = input;
            this.fileName = fileName;
            this.mimeType = mimeType;
            this.size = size;
        }
    }

    private static class ScanState {
        volatile boolean truncated = false;
        volatile int directories = 0;
        volatile int files = 0;
        volatile int unreadableDirectories = 0;
    }

    private static class InstalledInfo {
        final boolean installed;
        final String versionName;
        final long versionCode;

        InstalledInfo(boolean installed, String versionName, long versionCode) {
            this.installed = installed;
            this.versionName = versionName;
            this.versionCode = versionCode;
        }
    }

    private static class UpdateTask {
        final String id;
        final String appName;
        final String packageName;
        volatile String status = "queued";
        volatile int progress = 0;
        volatile String message = "等待下載";

        UpdateTask(String id, String appName, String packageName) {
            this.id = id;
            this.appName = appName;
            this.packageName = packageName;
        }

        void fail(String errorMessage) {
            status = "failed";
            message = errorMessage == null ? "更新失敗" : errorMessage;
        }

        JSONObject toJson() {
            JSONObject object = new JSONObject();
            try {
                object.put("ok", true);
                object.put("taskId", id);
                object.put("appName", appName);
                object.put("packageName", packageName);
                object.put("status", status);
                object.put("progress", progress);
                object.put("message", message);
            } catch (JSONException ignored) {
                // In-memory values are simple strings and numbers.
            }
            return object;
        }
    }
}
