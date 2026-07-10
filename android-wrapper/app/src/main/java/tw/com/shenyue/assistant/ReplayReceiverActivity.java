package tw.com.shenyue.assistant;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ReplayReceiverActivity extends Activity {
    private static final int STORAGE_PERMISSION_REQUEST = 7812;
    private static final int BUFFER_SIZE = 256 * 1024;
    private static final int MAX_DOWNLOAD_ATTEMPTS = 4;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private TextView titleView;
    private TextView percentView;
    private TextView stateView;
    private TextView detailView;
    private ProgressBar progressBar;
    private LinearLayout actions;
    private Button retryButton;
    private Button saveButton;
    private File downloadedFile;
    private Uri savedDownloadUri;
    private String downloadUrl = "";
    private String statusUrl = "";
    private String fileName = "replay-video.mp4";
    private String mimeType = "video/mp4";
    private long expectedSize = 0L;
    private volatile int downloadGeneration = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(7, 16, 24));
        getWindow().setNavigationBarColor(Color.rgb(7, 16, 24));
        buildUi();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(7, 16, 24));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(22), dp(28), dp(22), dp(30));
        scroll.addView(root, new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT,
                ScrollView.LayoutParams.WRAP_CONTENT
        ));

        TextView brand = text("SHEN YUE REPLAY", 13, Color.rgb(102, 220, 255));
        brand.setLetterSpacing(0.12f);
        root.addView(brand);

        titleView = text("申悅完整影片接收", 26, Color.WHITE);
        titleView.setPadding(0, dp(8), 0, dp(18));
        root.addView(titleView);

        percentView = text("0%", 76, Color.WHITE);
        percentView.setGravity(Gravity.CENTER);
        percentView.setTypeface(percentView.getTypeface(), android.graphics.Typeface.BOLD);
        root.addView(percentView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(14)
        );
        progressParams.setMargins(0, dp(16), 0, dp(14));
        root.addView(progressBar, progressParams);

        stateView = text("等待 QR 影片資料", 18, Color.rgb(225, 236, 241));
        stateView.setGravity(Gravity.CENTER);
        root.addView(stateView);

        detailView = text("手機與車機需連在同一個 Wi-Fi 或熱點。", 14, Color.rgb(158, 180, 191));
        detailView.setGravity(Gravity.CENTER);
        detailView.setPadding(0, dp(10), 0, dp(18));
        root.addView(detailView);

        actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.VERTICAL);
        actions.setVisibility(View.GONE);
        root.addView(actions, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        actions.addView(actionButton("分享到 LINE（完整影片）", true, view -> shareToPackage("jp.naver.line.android", "LINE")));
        actions.addView(actionButton("分享到 Facebook／Messenger", false, view -> shareFacebookOrMessenger()));
        actions.addView(actionButton("分享到微信", false, view -> shareToPackage("com.tencent.mm", "微信")));
        actions.addView(actionButton("系統分享完整影片", false, view -> shareToPackage("", "通訊 APP")));
        saveButton = actionButton("再次儲存到下載資料夾", false, view -> saveToDownloadsAsync());
        actions.addView(saveButton);

        retryButton = actionButton("重新下載完整影片", true, view -> startDownload());
        retryButton.setVisibility(View.GONE);
        root.addView(retryButton);

        setContentView(scroll);
    }

    private TextView text(String value, int sp, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setLineSpacing(0, 1.18f);
        return view;
    }

    private Button actionButton(String label, boolean primary, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(16);
        button.setAllCaps(false);
        button.setBackgroundColor(primary ? Color.rgb(205, 34, 59) : Color.rgb(31, 58, 73));
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(54)
        );
        params.setMargins(0, dp(6), 0, dp(6));
        button.setLayoutParams(params);
        return button;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void handleIntent(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null || !"shenyue-replay".equalsIgnoreCase(data.getScheme()) || !"download".equalsIgnoreCase(data.getHost())) {
            showFailure("QR 內容不正確，請回車機重新產生申悅回放 QR。");
            return;
        }

        downloadUrl = safeQuery(data, "url");
        statusUrl = safeQuery(data, "status");
        fileName = safeFileName(safeQuery(data, "name"));
        if (fileName.length() == 0) fileName = "replay-video.mp4";
        mimeType = safeQuery(data, "mime");
        if (mimeType.length() == 0) mimeType = "video/mp4";
        try {
            expectedSize = Long.parseLong(safeQuery(data, "size"));
        } catch (Exception ignored) {
            expectedSize = 0L;
        }
        titleView.setText(fileName);

        if (!isAllowedReplayUrl(downloadUrl) || (statusUrl.length() > 0 && !isAllowedReplayUrl(statusUrl))) {
            showFailure("影片網址不是可接受的車機區域網路網址。");
            return;
        }
        startDownload();
    }

    private String safeQuery(Uri uri, String name) {
        String value = uri.getQueryParameter(name);
        return value == null ? "" : value.trim();
    }

    private boolean isAllowedReplayUrl(String value) {
        try {
            URL url = new URL(value);
            String protocol = url.getProtocol();
            if (!"http".equalsIgnoreCase(protocol) && !"https".equalsIgnoreCase(protocol)) return false;
            String host = url.getHost();
            if (host == null || host.length() == 0) return false;
            if ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)) return true;
            InetAddress address = InetAddress.getByName(host);
            return address.isSiteLocalAddress() || address.isLinkLocalAddress();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void startDownload() {
        final int generation = ++downloadGeneration;
        actions.setVisibility(View.GONE);
        retryButton.setVisibility(View.GONE);
        downloadedFile = null;
        savedDownloadUri = null;
        updateProgress(0, "正在準備完整影片", "手機與車機需保持在同一個 Wi-Fi 或熱點。");
        executor.execute(() -> {
            try {
                waitForPhoneVideoReady(generation);
                if (generation != downloadGeneration) return;
                File file = downloadWithResume(generation);
                if (generation != downloadGeneration) return;
                downloadedFile = file;
                String saveNote = "完整影片已下載，可直接分享。";
                try {
                    savedDownloadUri = saveToDownloads(file);
                    if (savedDownloadUri != null) saveNote = "完整影片已儲存到下載資料夾。";
                } catch (Exception saveError) {
                    savedDownloadUri = null;
                    saveNote = "完整影片已下載；自動儲存失敗，但仍可直接分享。";
                }
                final String finalSaveNote = saveNote;
                mainHandler.post(() -> {
                    updateProgress(100, "下載完成 100%｜完整性驗證通過", formatBytes(file.length()) + "｜" + finalSaveNote);
                    actions.setVisibility(View.VISIBLE);
                    mainHandler.postDelayed(() -> shareToPackage("jp.naver.line.android", "LINE"), 450L);
                });
            } catch (Exception error) {
                if (generation == downloadGeneration) mainHandler.post(() -> showFailure(safeMessage(error)));
            }
        });
    }

    private void waitForPhoneVideoReady(int generation) throws Exception {
        if (statusUrl.length() == 0) return;
        for (int attempt = 0; attempt < 1200; attempt += 1) {
            if (generation != downloadGeneration) throw new IllegalStateException("下載已取消");
            HttpURLConnection connection = openConnection(statusUrl);
            connection.setRequestMethod("GET");
            try (InputStream input = connection.getInputStream()) {
                String json = readText(input);
                if (connection.getResponseCode() != 200) throw new IllegalStateException("車機準備狀態 HTTP " + connection.getResponseCode());
                JSONObject state = new JSONObject(json);
                if (!state.optBoolean("ok", false)) throw new IllegalStateException(state.optString("message", "影片準備失敗"));
                int progress = Math.max(0, Math.min(99, state.optInt("progress", 0)));
                String message = state.optString("message", "正在準備手機可用影片");
                mainHandler.post(() -> updateProgress(0, message, "影片準備 " + progress + "%｜下載會在準備完成後開始"));
                if ("done".equals(state.optString("status"))) {
                    fileName = safeFileName(state.optString("fileName", fileName));
                    mimeType = state.optString("mimeType", mimeType);
                    expectedSize = state.optLong("size", expectedSize);
                    return;
                }
                if ("failed".equals(state.optString("status"))) {
                    throw new IllegalStateException(message);
                }
            } finally {
                connection.disconnect();
            }
            Thread.sleep(500L);
        }
        throw new IllegalStateException("影片準備逾時，請回車機重新產生 QR。");
    }

    private File downloadWithResume(int generation) throws Exception {
        File directory = new File(getCacheDir(), ReplayFileProvider.DIRECTORY_NAME);
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("無法建立手機影片暫存資料夾");
        cleanupOldFiles(directory);
        File part = new File(directory, fileName + ".part");
        File target = new File(directory, fileName);
        if (part.exists()) part.delete();
        if (target.exists()) target.delete();

        long total = expectedSize;
        int attempts = 0;
        while (attempts < MAX_DOWNLOAD_ATTEMPTS) {
            if (generation != downloadGeneration) throw new IllegalStateException("下載已取消");
            long existing = part.exists() ? part.length() : 0L;
            HttpURLConnection connection = openConnection(downloadUrl);
            connection.setRequestMethod("GET");
            if (existing > 0L) connection.setRequestProperty("Range", "bytes=" + existing + "-");
            int code = connection.getResponseCode();
            if (code != 200 && code != 206) {
                connection.disconnect();
                throw new IllegalStateException("車機影片下載 HTTP " + code);
            }
            if (existing > 0L && code == 200) {
                existing = 0L;
                part.delete();
            }
            long responseLength = headerLong(connection, "Content-Length");
            long contentRangeTotal = contentRangeTotal(connection.getHeaderField("Content-Range"));
            if (contentRangeTotal > 0L) total = contentRangeTotal;
            else if (responseLength > 0L) total = existing + responseLength;
            if (total <= 0L || total < 1024L) {
                connection.disconnect();
                throw new IllegalStateException("車機未回傳有效的完整影片大小");
            }

            long downloaded = existing;
            long lastUiAt = 0L;
            try (InputStream input = connection.getInputStream();
                 FileOutputStream output = new FileOutputStream(part, existing > 0L)) {
                byte[] buffer = new byte[BUFFER_SIZE];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    if (generation != downloadGeneration) throw new IllegalStateException("下載已取消");
                    output.write(buffer, 0, read);
                    downloaded += read;
                    long now = System.currentTimeMillis();
                    if (now - lastUiAt >= 160L || downloaded >= total) {
                        int value = Math.min(99, (int) ((downloaded * 100L) / total));
                        long shownDownloaded = downloaded;
                        long shownTotal = total;
                        mainHandler.post(() -> updateProgress(value, "正在下載完整影片 " + value + "%", formatBytes(shownDownloaded) + " / " + formatBytes(shownTotal)));
                        lastUiAt = now;
                    }
                }
                output.flush();
            } catch (Exception error) {
                attempts += 1;
                connection.disconnect();
                if (attempts >= MAX_DOWNLOAD_ATTEMPTS) throw error;
                Thread.sleep(700L * attempts);
                continue;
            } finally {
                connection.disconnect();
            }

            if (part.length() == total) {
                if (!part.renameTo(target)) {
                    copyFile(part, target);
                    part.delete();
                }
                if (target.length() != total) throw new IllegalStateException("完整影片大小驗證失敗");
                return target;
            }
            if (part.length() > total) throw new IllegalStateException("收到的影片大小超過車機標示大小");
            attempts += 1;
            Thread.sleep(700L * attempts);
        }
        throw new IllegalStateException("影片下載不完整，已停止在 100% 之前，請重新下載。");
    }

    private HttpURLConnection openConnection(String value) throws Exception {
        if (!isAllowedReplayUrl(value)) throw new IllegalStateException("不允許的影片網址");
        HttpURLConnection connection = (HttpURLConnection) new URL(value).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(60000);
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept-Encoding", "identity");
        return connection;
    }

    private long headerLong(HttpURLConnection connection, String name) {
        try {
            return Long.parseLong(connection.getHeaderField(name));
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private long contentRangeTotal(String value) {
        if (value == null) return 0L;
        int slash = value.lastIndexOf('/');
        if (slash < 0 || slash + 1 >= value.length()) return 0L;
        try {
            return Long.parseLong(value.substring(slash + 1));
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private String readText(InputStream input) throws Exception {
        java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
        return output.toString("UTF-8");
    }

    private void copyFile(File source, File target) throws Exception {
        try (InputStream input = new FileInputStream(source); OutputStream output = new FileOutputStream(target)) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
        }
    }

    private void cleanupOldFiles(File directory) {
        File[] files = directory.listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - 24L * 60L * 60L * 1000L;
        for (File file : files) {
            if (file.lastModified() < cutoff) file.delete();
        }
    }

    private Uri saveToDownloads(File source) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, source.getName());
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/ShenYueReplay");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("無法建立下載檔案");
            try (InputStream input = new FileInputStream(source); OutputStream output = getContentResolver().openOutputStream(uri, "w")) {
                if (output == null) throw new IllegalStateException("無法寫入下載檔案");
                byte[] buffer = new byte[BUFFER_SIZE];
                int read;
                while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(uri, values, null, null);
            return uri;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE }, STORAGE_PERMISSION_REQUEST);
            return null;
        }
        File downloads = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "ShenYueReplay");
        if (!downloads.exists() && !downloads.mkdirs()) return null;
        File destination = new File(downloads, source.getName());
        copyFile(source, destination);
        return Uri.fromFile(destination);
    }

    private void saveToDownloadsAsync() {
        File file = downloadedFile;
        if (file == null || !file.isFile()) return;
        saveButton.setEnabled(false);
        executor.execute(() -> {
            try {
                savedDownloadUri = saveToDownloads(file);
                mainHandler.post(() -> Toast.makeText(this, "完整影片已儲存到下載資料夾。", Toast.LENGTH_LONG).show());
            } catch (Exception error) {
                mainHandler.post(() -> Toast.makeText(this, safeMessage(error), Toast.LENGTH_LONG).show());
            } finally {
                mainHandler.post(() -> saveButton.setEnabled(true));
            }
        });
    }

    private void shareFacebookOrMessenger() {
        if (isPackageInstalled("com.facebook.orca")) {
            shareToPackage("com.facebook.orca", "Messenger");
        } else {
            shareToPackage("com.facebook.katana", "Facebook");
        }
    }

    private void shareToPackage(String packageName, String label) {
        File file = downloadedFile;
        if (file == null || !file.isFile() || file.length() <= 0L) {
            Toast.makeText(this, "完整影片尚未下載完成。", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            Uri uri = savedDownloadUri;
            if (uri == null || "file".equalsIgnoreCase(uri.getScheme())) {
                uri = new Uri.Builder()
                        .scheme("content")
                        .authority(getPackageName() + ".replayfiles")
                        .appendPath(file.getName())
                        .build();
            }
            Intent send = new Intent(Intent.ACTION_SEND);
            String shareType = mimeType == null || mimeType.length() == 0 || "application/octet-stream".equalsIgnoreCase(mimeType)
                    ? "video/*"
                    : mimeType;
            send.setType(shareType);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_TEXT, file.getName());
            send.setClipData(ClipData.newRawUri(file.getName(), uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (packageName != null && packageName.length() > 0 && isPackageInstalled(packageName)) {
                send.setPackage(packageName);
                startActivity(send);
            } else {
                startActivity(Intent.createChooser(send, "分享完整影片到 " + label));
            }
        } catch (Exception error) {
            Toast.makeText(this, "無法開啟 " + label + "：" + safeMessage(error), Toast.LENGTH_LONG).show();
        }
    }

    private boolean isPackageInstalled(String packageName) {
        try {
            getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void updateProgress(int value, String state, String detail) {
        int progress = Math.max(0, Math.min(100, value));
        percentView.setText(String.format(Locale.TAIWAN, "%d%%", progress));
        progressBar.setProgress(progress);
        stateView.setText(state);
        detailView.setText(detail);
        detailView.setTextColor(Color.rgb(158, 180, 191));
        titleView.setText(fileName);
    }

    private void showFailure(String message) {
        actions.setVisibility(View.GONE);
        retryButton.setVisibility(downloadUrl.length() > 0 ? View.VISIBLE : View.GONE);
        stateView.setText("尚未完成下載");
        detailView.setText(message == null || message.length() == 0 ? "下載失敗，請重試。" : message);
        detailView.setTextColor(Color.rgb(255, 184, 192));
    }

    private String safeFileName(String value) {
        String name = value == null ? "" : value.trim().replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "_");
        if (name.length() > 160) name = name.substring(name.length() - 160);
        return name;
    }

    private String safeMessage(Throwable error) {
        if (error == null) return "未知錯誤";
        String message = error.getMessage();
        return message == null || message.length() == 0 ? error.getClass().getSimpleName() : message;
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024L) return bytes + " B";
        double value = bytes;
        String[] units = { "B", "KB", "MB", "GB" };
        int index = 0;
        while (value >= 1024d && index < units.length - 1) {
            value /= 1024d;
            index += 1;
        }
        return String.format(Locale.TAIWAN, "%.1f %s", value, units[index]);
    }

    @Override
    protected void onDestroy() {
        downloadGeneration += 1;
        executor.shutdownNow();
        super.onDestroy();
    }
}
