package tw.com.shenyue.assistant;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
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
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UpdateBridge {
    static final String PREFS_NAME = "shen_yue_update_center";
    static final String LAST_INSTALL_STATUS = "last_install_status";
    static final String ACTION_INSTALL_COMMIT = "tw.com.shenyue.assistant.INSTALL_COMMIT";

    private final Activity activity;
    private final PackageManager packageManager;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ConcurrentHashMap<String, UpdateTask> tasks = new ConcurrentHashMap<>();

    UpdateBridge(Activity activity) {
        this.activity = activity;
        this.packageManager = activity.getPackageManager();
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
