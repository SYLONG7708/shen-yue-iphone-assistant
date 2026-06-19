package tw.com.shenyue.assistant;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ContentUris;
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
import android.os.Build;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UpdateBridge {
    static final String PREFS_NAME = "shen_yue_update_center";
    static final String LAST_INSTALL_STATUS = "last_install_status";
    static final String ACTION_INSTALL_COMMIT = "tw.com.shenyue.assistant.INSTALL_COMMIT";
    private static final int VIDEO_PERMISSION_REQUEST_CODE = 7710;
    private static final int LOCAL_VIDEO_SCAN_LIMIT = 120;
    private static final int FAST_UPLOAD_BUFFER_SIZE = 256 * 1024;
    private static final long UPLOAD_PROGRESS_INTERVAL_MS = 180L;
    private static final String[] VIDEO_EXTENSIONS = {
            ".mp4", ".ts", ".mts", ".m2ts"
    };

    private final Activity activity;
    private final PackageManager packageManager;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ConcurrentHashMap<String, UpdateTask> tasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, VideoPrepareTask> videoPrepareTasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, VideoUploadTask> videoUploadTasks = new ConcurrentHashMap<>();
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

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
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
        JSONObject result = new JSONObject();
        JSONArray items = new JSONArray();
        JSONArray scanRoots = new JSONArray();
        Set<String> seen = new HashSet<>();
        try {
            appendVideoAccessState(result);
            if (!hasVideoReadPermission() && !hasAllFilesAccess()) {
                result.put("ok", false);
                result.put("code", "NEED_VIDEO_PERMISSION");
                result.put("message", "請先允許讀取影片；固定讀取 USB 的 DCIM/CAMERA 可能需要所有檔案存取。");
                result.put("items", items);
                result.put("scanRoots", scanRoots);
                return result.toString();
            }

            if (canScanRawExternalFiles()) {
                scanUsbCameraVideoFiles(items, seen, scanRoots);
            } else {
                queryVideoStore(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, items, seen);
                queryVideoStore(MediaStore.Video.Media.INTERNAL_CONTENT_URI, items, seen);
            }

            result.put("ok", true);
            result.put("items", items);
            result.put("count", items.length());
            result.put("scanRoots", scanRoots);
            result.put("scanPaths", "USB1/USB2/sdcard1/usb_storage/udisk DCIM/CAMERA MP4/TS");
        } catch (Exception error) {
            putError(result, error);
            try {
                result.put("items", items);
                result.put("scanRoots", scanRoots);
            } catch (JSONException ignored) {
                // JSON error while reporting another error.
            }
        }
        return result.toString();
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

    private void queryVideoStore(Uri storeUri, JSONArray items, Set<String> seen) {
        if (items.length() >= LOCAL_VIDEO_SCAN_LIMIT) return;

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
            while (cursor.moveToNext() && items.length() < LOCAL_VIDEO_SCAN_LIMIT) {
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
                if (!isUsbCameraPath(pathForFilter) || !isLikelyVideoName(name)) continue;
                item.put("id", "media-" + id);
                item.put("uri", uriValue);
                item.put("name", name);
                item.put("size", getCursorLong(cursor, MediaStore.Video.Media.SIZE, 0L));
                item.put("modified", getCursorLong(cursor, MediaStore.Video.Media.DATE_MODIFIED, 0L) * 1000L);
                item.put("duration", getCursorLong(cursor, MediaStore.Video.Media.DURATION, 0L));
                item.put("mimeType", getCursorString(cursor, MediaStore.Video.Media.MIME_TYPE, guessVideoMime(name)));
                item.put("path", relativePath);
                item.put("source", describeUsbCameraSource(pathForFilter));
                items.put(item);
            }
        } catch (Exception ignored) {
            // Some car firmwares expose broken MediaStore providers; direct folder scan remains a fallback.
        }
    }

    private void scanUsbCameraVideoFiles(JSONArray items, Set<String> seen, JSONArray scanRoots) {
        List<File> roots = new ArrayList<>();
        addKnownUsbCameraRoots(roots, scanRoots);
        discoverUsbCameraRoots(roots, scanRoots);

        for (File root : roots) {
            if (items.length() >= LOCAL_VIDEO_SCAN_LIMIT) return;
            scanRoot(root, items, seen);
        }
    }

    private void addKnownUsbCameraRoots(List<File> roots, JSONArray scanRoots) {
        File[] directVolumes = {
                new File("/storage/sdcard1"),
                new File("/storage/sdcard2"),
                new File("/storage/usb_storage"),
                new File("/mnt/media_rw/usb_storage"),
                new File("/mnt/sdcard"),
                new File("/mnt/usb_storage"),
                new File("/mnt/usbhost"),
                new File("/storage/usbotg"),
                new File("/storage/udisk"),
                new File("/storage/udisk1"),
                new File("/mnt/udisk"),
                new File("/mnt/udisk1")
        };
        for (File volume : directVolumes) {
            addUsbCameraRoot(roots, volume, scanRoots);
        }

        String[] parents = {
                "/storage",
                "/mnt/media_rw",
                "/storage/usb_storage",
                "/mnt/usb_storage",
                "/mnt",
                "/mnt/media_rw/usb_storage"
        };
        String[] volumes = {
                "USB1", "USB2", "usb1", "usb2", "Usb1", "Usb2",
                "USB_DISK0", "USB_DISK1", "usb_storage", "sdcard1", "sdcard2",
                "udisk", "udisk1", "usbotg", "Storage01", "Storage02"
        };
        for (String parent : parents) {
            for (String volume : volumes) {
                addUsbCameraRoot(roots, new File(parent, volume), scanRoots);
            }
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
                addUsbCameraRoot(roots, child, scanRoots);
                File[] grandchildren;
                try {
                    grandchildren = child.listFiles();
                } catch (Exception error) {
                    continue;
                }
                if (grandchildren == null) continue;
                for (File grandchild : grandchildren) {
                    if (grandchild.isDirectory() && !isIgnoredStorageName(grandchild.getName())) {
                        addUsbCameraRoot(roots, grandchild, scanRoots);
                    }
                }
            }
        }
    }

    private void addUsbCameraRoot(List<File> roots, File volumeRoot, JSONArray scanRoots) {
        addRoot(roots, new File(new File(volumeRoot, "DCIM"), "CAMERA"), scanRoots);
        addRoot(roots, new File(new File(volumeRoot, "DCIM"), "Camera"), scanRoots);
        addRoot(roots, new File(new File(volumeRoot, "DCIM"), "camera"), scanRoots);
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

    private void scanRoot(File root, JSONArray items, Set<String> seen) {
        ArrayDeque<FileDepth> queue = new ArrayDeque<>();
        queue.add(new FileDepth(root, 0));
        while (!queue.isEmpty() && items.length() < LOCAL_VIDEO_SCAN_LIMIT) {
            FileDepth current = queue.removeFirst();
            File[] children;
            try {
                children = current.file.listFiles();
            } catch (Exception error) {
                continue;
            }
            if (children == null) continue;

            for (File child : children) {
                if (items.length() >= LOCAL_VIDEO_SCAN_LIMIT) return;
                if (child.isDirectory()) {
                    if (current.depth < 2) {
                        queue.add(new FileDepth(child, current.depth + 1));
                    }
                } else if (isLikelyVideoFile(child)) {
                    String uri = Uri.fromFile(child).toString();
                    if (!seen.add(uri)) continue;
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
                        item.put("source", describeUsbCameraSource(child.getAbsolutePath()));
                        items.put(item);
                    } catch (JSONException ignored) {
                        // Skip malformed row only.
                    }
                }
            }
        }
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

    private boolean isUsbCameraPath(String path) {
        String value = normalizePath(path);
        return value.contains("/dcim/camera") && !value.contains("/emulated/0/android/");
    }

    private String describeUsbCameraSource(String path) {
        String value = normalizePath(path);
        if (value.contains("/usb2/")) return "USB2/DCIM/CAMERA";
        if (value.contains("/sdcard2/")) return "sdcard2/DCIM/CAMERA";
        if (value.contains("/sdcard1/")) return "sdcard1/DCIM/CAMERA";
        if (value.contains("/usb_storage/")) return "usb_storage/DCIM/CAMERA";
        if (value.contains("/udisk1/")) return "udisk1/DCIM/CAMERA";
        if (value.contains("/udisk/")) return "udisk/DCIM/CAMERA";
        if (value.contains("/usbotg/")) return "usbotg/DCIM/CAMERA";
        if (value.contains("/storage01/")) return "Storage01/DCIM/CAMERA";
        if (value.contains("/storage02/")) return "Storage02/DCIM/CAMERA";
        return "USB1/DCIM/CAMERA";
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
            if (isTransportStreamName(name) || isTransportStreamMime(type)) {
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
        if (isTransportStreamName(file.getName()) || (isTransportStreamName(name) && isTransportStreamMime(type))) {
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
            throw new IllegalStateException("Transport stream source file was not found.");
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
                throw new IllegalStateException("No MP4-compatible video track was found in this TS file.");
            }

            maxInputSize = Math.max(1024 * 1024, Math.min(maxInputSize, 32 * 1024 * 1024));
            ByteBuffer buffer = ByteBuffer.allocate(maxInputSize);
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            muxer.start();
            muxerStarted = true;
            long writtenSamples = 0L;
            long lastProgressAt = 0L;
            if (task != null) {
                task.message = "Converting TS to MP4...";
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
                throw new IllegalStateException("No playable samples were found in this TS file.");
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
            throw new IllegalStateException("Unable to prepare TS video as MP4: " + safeMessage(error), error);
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

    private static class FileDepth {
        final File file;
        final int depth;

        FileDepth(File file, int depth) {
            this.file = file;
            this.depth = depth;
        }
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
