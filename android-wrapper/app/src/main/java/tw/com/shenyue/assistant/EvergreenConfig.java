package tw.com.shenyue.assistant;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

final class EvergreenConfig {
    static final int BRIDGE_VERSION = 2;
    static final int CONFIG_SCHEMA = 1;
    static final int ABSOLUTE_MAX_SCAN_LIMIT = 250000;
    static final String DEFAULT_REVISION = "builtin-1.0.36";

    final String revision;
    final boolean scanRawFiles;
    final boolean scanMediaStore;
    final boolean fullScanRemovableVolumes;
    final int scanLimit;
    final int maxDepth;
    final List<String> mediaRoots;
    final List<String> fullRoots;
    final List<String> mountParents;
    final List<String> volumeNames;
    final List<String> folderPaths;
    final Set<String> extensions;
    final Set<String> remuxExtensions;
    final Set<String> ignoredDirectoryNames;
    final List<String> removablePathHints;
    final List<SourceRule> sourceRules;
    final long shareTtlMs;
    final int downloadAttempts;
    final int connectTimeoutMs;
    final int readTimeoutMs;
    final int stallTimeoutMs;
    final String autoSharePackage;
    final List<ShareTarget> shareTargets;

    private EvergreenConfig(
            String revision,
            boolean scanRawFiles,
            boolean scanMediaStore,
            boolean fullScanRemovableVolumes,
            int scanLimit,
            int maxDepth,
            List<String> mediaRoots,
            List<String> fullRoots,
            List<String> mountParents,
            List<String> volumeNames,
            List<String> folderPaths,
            Set<String> extensions,
            Set<String> remuxExtensions,
            Set<String> ignoredDirectoryNames,
            List<String> removablePathHints,
            List<SourceRule> sourceRules,
            long shareTtlMs,
            int downloadAttempts,
            int connectTimeoutMs,
            int readTimeoutMs,
            int stallTimeoutMs,
            String autoSharePackage,
            List<ShareTarget> shareTargets
    ) {
        this.revision = revision;
        this.scanRawFiles = scanRawFiles;
        this.scanMediaStore = scanMediaStore;
        this.fullScanRemovableVolumes = fullScanRemovableVolumes;
        this.scanLimit = scanLimit;
        this.maxDepth = maxDepth;
        this.mediaRoots = immutableList(mediaRoots);
        this.fullRoots = immutableList(fullRoots);
        this.mountParents = immutableList(mountParents);
        this.volumeNames = immutableList(volumeNames);
        this.folderPaths = immutableList(folderPaths);
        this.extensions = immutableSet(extensions);
        this.remuxExtensions = immutableSet(remuxExtensions);
        this.ignoredDirectoryNames = immutableSet(ignoredDirectoryNames);
        this.removablePathHints = immutableList(removablePathHints);
        this.sourceRules = Collections.unmodifiableList(new ArrayList<>(sourceRules));
        this.shareTtlMs = shareTtlMs;
        this.downloadAttempts = downloadAttempts;
        this.connectTimeoutMs = connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs;
        this.stallTimeoutMs = stallTimeoutMs;
        this.autoSharePackage = autoSharePackage;
        this.shareTargets = Collections.unmodifiableList(new ArrayList<>(shareTargets));
    }

    static EvergreenConfig defaults() {
        LinkedHashSet<String> defaultExtensions = new LinkedHashSet<>(Arrays.asList(
                ".mp4", ".m4v", ".mov", ".ts", ".mts", ".m2ts",
                ".avi", ".mkv", ".webm", ".3gp", ".3g2", ".3gpp", ".3gpp2",
                ".dav", ".264", ".h264", ".hevc", ".h265", ".insv", ".lrv",
                ".vob", ".mpg", ".mpeg", ".asf", ".wmv", ".flv", ".f4v", ".ogv"
        ));
        LinkedHashSet<String> defaultRemuxExtensions = new LinkedHashSet<>(Arrays.asList(
                ".mov", ".ts", ".mts", ".m2ts", ".avi", ".mkv", ".webm", ".3gp", ".3g2",
                ".3gpp", ".3gpp2", ".dav", ".264", ".h264", ".hevc", ".h265", ".insv",
                ".lrv", ".vob", ".mpg", ".mpeg", ".asf", ".wmv", ".flv", ".f4v", ".ogv"
        ));
        List<SourceRule> rules = Arrays.asList(
                new SourceRule("/usb3/", "USB3"),
                new SourceRule("/usb_disk2/", "USB3"),
                new SourceRule("/sdcard3/", "USB3/sdcard3"),
                new SourceRule("/udisk2/", "USB3/udisk2"),
                new SourceRule("/storage03/", "USB3/Storage03"),
                new SourceRule("/usb2/", "USB2"),
                new SourceRule("/usb_disk1/", "USB2"),
                new SourceRule("/sdcard2/", "USB2/sdcard2"),
                new SourceRule("/usb1/", "USB1"),
                new SourceRule("/usb_disk0/", "USB1"),
                new SourceRule("/sdcard1/", "USB1/sdcard1"),
                new SourceRule("/usb_storage/", "usb_storage"),
                new SourceRule("/udisk1/", "udisk1"),
                new SourceRule("/udisk/", "udisk"),
                new SourceRule("/usbotg/", "usbotg"),
                new SourceRule("/storage01/", "Storage01"),
                new SourceRule("/storage02/", "Storage02"),
                new SourceRule("/storage/emulated/0/", "內部儲存"),
                new SourceRule("/data/media/0/", "內部儲存"),
                new SourceRule("/sdcard/", "內部儲存")
        );
        List<ShareTarget> targets = Arrays.asList(
                new ShareTarget("LINE", "jp.naver.line.android", true),
                new ShareTarget("Messenger", "com.facebook.orca", false),
                new ShareTarget("Facebook", "com.facebook.katana", false),
                new ShareTarget("微信", "com.tencent.mm", false),
                new ShareTarget("系統分享", "", false)
        );
        return new EvergreenConfig(
                DEFAULT_REVISION,
                true,
                true,
                true,
                100000,
                0,
                Arrays.asList("/sdcard", "/storage/emulated/0", "/data/media/0", "/mnt/sdcard"),
                Arrays.asList(
                        "/storage/sdcard1", "/storage/sdcard2", "/storage/sdcard3",
                        "/storage/usb_storage", "/mnt/media_rw/usb_storage", "/mnt/usb_storage",
                        "/mnt/usbhost", "/storage/usbotg", "/storage/udisk", "/storage/udisk1",
                        "/storage/udisk2", "/mnt/udisk", "/mnt/udisk1", "/mnt/udisk2",
                        "/aw3603D", "/360res/aw3603D", "/sdcard/aw3603D",
                        "/sdcard/360res/aw3603D", "/storage/emulated/0/aw3603D",
                        "/storage/emulated/0/360res/aw3603D", "/data/media/0/aw3603D",
                        "/data/media/0/360res/aw3603D"
                ),
                Arrays.asList(
                        "/storage", "/sdcard", "/data/media/0", "/mnt/media_rw",
                        "/storage/usb_storage", "/mnt/usb_storage", "/mnt",
                        "/mnt/media_rw/usb_storage", "/mnt/usbhost"
                ),
                Arrays.asList(
                        "USB1", "USB2", "USB3", "usb1", "usb2", "usb3", "Usb1", "Usb2", "Usb3",
                        "USB_DISK0", "USB_DISK1", "USB_DISK2", "usb_storage",
                        "sdcard1", "sdcard2", "sdcard3", "udisk", "udisk1", "udisk2", "usbotg",
                        "Storage01", "Storage02", "Storage03"
                ),
                Arrays.asList(
                        "DCIM/CAMERA", "DCIM/Camera", "DCIM/camera", "DCIM", "Movies", "Video",
                        "Videos", "Download", "aw3603D", "360res/aw3603D", "360", "360Video",
                        "DVR", "Record", "Recorder", "CarRecorder", "CarDVR", "DashCam", "dashcam"
                ),
                defaultExtensions,
                defaultRemuxExtensions,
                new LinkedHashSet<>(Arrays.asList("system volume information", "$recycle.bin")),
                Arrays.asList("/media_rw/", "/usb", "/udisk", "/usbotg", "/sdcard1", "/sdcard2", "/sdcard3", "/storage0"),
                rules,
                6L * 60L * 60L * 1000L,
                6,
                15000,
                90000,
                45000,
                "jp.naver.line.android",
                targets
        );
    }

    static EvergreenConfig parse(String raw) throws JSONException {
        EvergreenConfig fallback = defaults();
        JSONObject root = new JSONObject(raw == null ? "{}" : raw);
        if (!root.has("schema")) throw new JSONException("常青設定缺少 schema");
        int schema = root.optInt("schema", -1);
        if (schema != CONFIG_SCHEMA) throw new JSONException("不支援的常青設定 schema：" + schema);
        int minimumBridge = root.optInt("minimumBridgeVersion", 1);
        if (minimumBridge > BRIDGE_VERSION) {
            throw new JSONException("此設定需要原生橋接 v" + minimumBridge + "，目前為 v" + BRIDGE_VERSION);
        }

        JSONObject scan = root.optJSONObject("scan");
        if (scan == null) scan = new JSONObject();
        JSONObject download = root.optJSONObject("download");
        if (download == null) download = new JSONObject();
        JSONObject sharing = root.optJSONObject("sharing");
        if (sharing == null) sharing = new JSONObject();

        String rawRevision = root.optString("revision", "").trim();
        if (rawRevision.length() == 0) throw new JSONException("常青設定缺少 revision");
        String revision = safeText(rawRevision, 80, fallback.revision);
        int scanLimit = bounded(scan.optInt("limit", fallback.scanLimit), 1, ABSOLUTE_MAX_SCAN_LIMIT);
        int maxDepth = bounded(scan.optInt("maxDepth", fallback.maxDepth), 0, 256);
        List<String> mediaRoots = readAbsolutePaths(scan, "mediaRoots", fallback.mediaRoots, 64);
        List<String> fullRoots = readAbsolutePaths(scan, "fullRoots", fallback.fullRoots, 128);
        List<String> mountParents = readAbsolutePaths(scan, "mountParents", fallback.mountParents, 64);
        List<String> volumeNames = readNames(scan, "volumeNames", fallback.volumeNames, 128);
        List<String> folderPaths = readRelativePaths(scan, "folderPaths", fallback.folderPaths, 128);
        Set<String> extensions = readExtensions(scan, "extensions", fallback.extensions, 96);
        Set<String> remuxExtensions = readExtensions(download, "remuxExtensions", fallback.remuxExtensions, 96);
        Set<String> ignored = readLowerNames(scan, "ignoredDirectoryNames", fallback.ignoredDirectoryNames, 64);
        List<String> removableHints = readLowerTexts(scan, "removablePathHints", fallback.removablePathHints, 64, 80);
        List<SourceRule> sourceRules = readSourceRules(scan, fallback.sourceRules);

        long ttlMinutes = bounded(download.optInt("shareTtlMinutes", (int) (fallback.shareTtlMs / 60000L)), 5, 1440);
        int attempts = bounded(download.optInt("maxResumeAttempts", fallback.downloadAttempts), 1, 12);
        int connectTimeout = bounded(download.optInt("connectTimeoutMs", fallback.connectTimeoutMs), 3000, 60000);
        int readTimeout = bounded(download.optInt("readTimeoutMs", fallback.readTimeoutMs), 15000, 600000);
        int stallTimeout = bounded(download.optInt("stallTimeoutMs", fallback.stallTimeoutMs), 10000, 180000);
        String autoPackage = safePackage(sharing.optString("autoOpenPackage", fallback.autoSharePackage));
        List<ShareTarget> targets = readShareTargets(sharing, fallback.shareTargets);

        return new EvergreenConfig(
                revision,
                scan.optBoolean("rawFiles", fallback.scanRawFiles),
                scan.optBoolean("mediaStore", fallback.scanMediaStore),
                scan.optBoolean("fullScanRemovableVolumes", fallback.fullScanRemovableVolumes),
                scanLimit,
                maxDepth,
                mediaRoots,
                fullRoots,
                mountParents,
                volumeNames,
                folderPaths,
                extensions,
                remuxExtensions,
                ignored,
                removableHints,
                sourceRules,
                ttlMinutes * 60000L,
                attempts,
                connectTimeout,
                readTimeout,
                stallTimeout,
                autoPackage,
                targets
        );
    }

    JSONObject toJson() throws JSONException {
        JSONObject root = new JSONObject();
        root.put("schema", CONFIG_SCHEMA);
        root.put("minimumBridgeVersion", BRIDGE_VERSION);
        root.put("revision", revision);
        JSONObject scan = new JSONObject();
        scan.put("rawFiles", scanRawFiles);
        scan.put("mediaStore", scanMediaStore);
        scan.put("fullScanRemovableVolumes", fullScanRemovableVolumes);
        scan.put("limit", scanLimit);
        scan.put("maxDepth", maxDepth);
        scan.put("mediaRoots", new JSONArray(mediaRoots));
        scan.put("fullRoots", new JSONArray(fullRoots));
        scan.put("mountParents", new JSONArray(mountParents));
        scan.put("volumeNames", new JSONArray(volumeNames));
        scan.put("folderPaths", new JSONArray(folderPaths));
        scan.put("extensions", new JSONArray(extensions));
        scan.put("ignoredDirectoryNames", new JSONArray(ignoredDirectoryNames));
        scan.put("removablePathHints", new JSONArray(removablePathHints));
        JSONArray rules = new JSONArray();
        for (SourceRule rule : sourceRules) rules.put(rule.toJson());
        scan.put("sourceRules", rules);
        root.put("scan", scan);
        JSONObject download = new JSONObject();
        download.put("shareTtlMinutes", shareTtlMs / 60000L);
        download.put("maxResumeAttempts", downloadAttempts);
        download.put("connectTimeoutMs", connectTimeoutMs);
        download.put("readTimeoutMs", readTimeoutMs);
        download.put("stallTimeoutMs", stallTimeoutMs);
        download.put("remuxExtensions", new JSONArray(remuxExtensions));
        root.put("download", download);
        JSONObject sharing = new JSONObject();
        sharing.put("autoOpenPackage", autoSharePackage);
        JSONArray targets = new JSONArray();
        for (ShareTarget target : shareTargets) targets.put(target.toJson());
        sharing.put("targets", targets);
        root.put("sharing", sharing);
        return root;
    }

    JSONObject toSummary(boolean cached) throws JSONException {
        JSONObject result = new JSONObject();
        result.put("ok", true);
        result.put("bridgeVersion", BRIDGE_VERSION);
        result.put("configSchema", CONFIG_SCHEMA);
        result.put("revision", revision);
        result.put("cached", cached);
        result.put("scanLimit", scanLimit);
        result.put("maxDepth", maxDepth);
        result.put("extensionCount", extensions.size());
        result.put("remuxExtensionCount", remuxExtensions.size());
        result.put("mediaRootCount", mediaRoots.size());
        result.put("fullRootCount", fullRoots.size());
        result.put("volumeNameCount", volumeNames.size());
        result.put("folderPathCount", folderPaths.size());
        result.put("downloadAttempts", downloadAttempts);
        result.put("shareTtlMinutes", shareTtlMs / 60000L);
        result.put("shareTargetCount", shareTargets.size());
        return result;
    }

    String shareTargetsJson() {
        JSONArray array = new JSONArray();
        for (ShareTarget target : shareTargets) {
            try {
                array.put(target.toJson());
            } catch (JSONException ignored) {
                // Validated values are JSON-safe.
            }
        }
        return array.toString();
    }

    boolean isIgnoredDirectory(String name) {
        return ignoredDirectoryNames.contains(name == null ? "" : name.trim().toLowerCase(Locale.US));
    }

    String sourceLabelForPath(String normalizedPath) {
        String path = normalizedPath == null ? "" : normalizedPath.toLowerCase(Locale.US);
        for (SourceRule rule : sourceRules) {
            if (path.contains(rule.contains)) return rule.label;
        }
        return "車機影片";
    }

    private static List<SourceRule> readSourceRules(JSONObject scan, List<SourceRule> fallback) throws JSONException {
        JSONArray array = scan.optJSONArray("sourceRules");
        if (array == null) return fallback;
        List<SourceRule> result = new ArrayList<>();
        for (int index = 0; index < array.length() && result.size() < 64; index += 1) {
            JSONObject item = array.optJSONObject(index);
            if (item == null) continue;
            String contains = safeText(item.optString("contains", ""), 100, "").toLowerCase(Locale.US);
            String label = safeText(item.optString("label", ""), 40, "");
            if (contains.length() > 0 && label.length() > 0) result.add(new SourceRule(contains, label));
        }
        return result.isEmpty() ? fallback : result;
    }

    private static List<ShareTarget> readShareTargets(JSONObject sharing, List<ShareTarget> fallback) throws JSONException {
        JSONArray array = sharing.optJSONArray("targets");
        if (array == null) return fallback;
        List<ShareTarget> result = new ArrayList<>();
        for (int index = 0; index < array.length() && result.size() < 12; index += 1) {
            JSONObject item = array.optJSONObject(index);
            if (item == null) continue;
            String label = safeText(item.optString("label", ""), 40, "");
            String packageName = safePackage(item.optString("package", ""));
            if (label.length() > 0) result.add(new ShareTarget(label, packageName, item.optBoolean("primary", false)));
        }
        return result.isEmpty() ? fallback : result;
    }

    private static List<String> readAbsolutePaths(JSONObject object, String key, List<String> fallback, int max) throws JSONException {
        JSONArray array = object.optJSONArray(key);
        if (array == null) return fallback;
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (int index = 0; index < array.length() && result.size() < max; index += 1) {
            String path = safeText(array.optString(index, ""), 240, "").replace('\\', '/');
            if (path.length() == 0) continue;
            if (!path.startsWith("/") || path.contains("..") || !isAllowedStoragePath(path)) {
                throw new JSONException("不允許的掃描絕對路徑：" + path);
            }
            result.add(path.replaceAll("/+", "/"));
        }
        return new ArrayList<>(result);
    }

    private static boolean isAllowedStoragePath(String value) {
        String path = value.toLowerCase(Locale.US);
        return path.equals("/aw3603d")
                || path.startsWith("/aw3603d/")
                || path.equals("/360res")
                || path.startsWith("/360res/")
                || path.equals("/storage")
                || path.startsWith("/storage/")
                || path.equals("/mnt")
                || path.startsWith("/mnt/")
                || path.equals("/sdcard")
                || path.startsWith("/sdcard/")
                || path.equals("/data/media/0")
                || path.startsWith("/data/media/0/");
    }

    private static List<String> readRelativePaths(JSONObject object, String key, List<String> fallback, int max) throws JSONException {
        JSONArray array = object.optJSONArray(key);
        if (array == null) return fallback;
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (int index = 0; index < array.length() && result.size() < max; index += 1) {
            String path = safeText(array.optString(index, ""), 160, "").replace('\\', '/').replaceAll("/+", "/");
            while (path.startsWith("/")) path = path.substring(1);
            if (path.length() == 0 || path.contains("..")) throw new JSONException("不允許的相對掃描路徑：" + path);
            result.add(path);
        }
        return new ArrayList<>(result);
    }

    private static List<String> readNames(JSONObject object, String key, List<String> fallback, int max) throws JSONException {
        JSONArray array = object.optJSONArray(key);
        if (array == null) return fallback;
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (int index = 0; index < array.length() && result.size() < max; index += 1) {
            String name = safeText(array.optString(index, ""), 64, "");
            if (name.length() == 0) continue;
            if (!name.matches("[A-Za-z0-9._-]+")) throw new JSONException("不允許的磁碟名稱：" + name);
            result.add(name);
        }
        return new ArrayList<>(result);
    }

    private static Set<String> readExtensions(JSONObject object, String key, Set<String> fallback, int max) throws JSONException {
        JSONArray array = object.optJSONArray(key);
        if (array == null) return fallback;
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (int index = 0; index < array.length() && result.size() < max; index += 1) {
            String extension = safeText(array.optString(index, ""), 16, "").toLowerCase(Locale.US);
            if (!extension.startsWith(".")) extension = "." + extension;
            if (!extension.matches("\\.[a-z0-9]{1,12}")) throw new JSONException("不允許的影片副檔名：" + extension);
            result.add(extension);
        }
        if (result.isEmpty()) throw new JSONException("影片副檔名清單不可為空");
        return result;
    }

    private static Set<String> readLowerNames(JSONObject object, String key, Set<String> fallback, int max) {
        JSONArray array = object.optJSONArray(key);
        if (array == null) return fallback;
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (int index = 0; index < array.length() && result.size() < max; index += 1) {
            String name = safeText(array.optString(index, ""), 80, "").toLowerCase(Locale.US);
            if (name.length() > 0 && !name.contains("/") && !name.contains("\\") && !name.contains("..")) result.add(name);
        }
        return result;
    }

    private static List<String> readLowerTexts(JSONObject object, String key, List<String> fallback, int max, int maxLength) {
        JSONArray array = object.optJSONArray(key);
        if (array == null) return fallback;
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (int index = 0; index < array.length() && result.size() < max; index += 1) {
            String value = safeText(array.optString(index, ""), maxLength, "").toLowerCase(Locale.US);
            if (value.length() > 0) result.add(value);
        }
        return new ArrayList<>(result);
    }

    private static String safePackage(String value) throws JSONException {
        String packageName = safeText(value, 160, "");
        if (packageName.length() > 0 && !packageName.matches("[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)+")) {
            throw new JSONException("不允許的分享套件名稱：" + packageName);
        }
        return packageName;
    }

    private static String safeText(String value, int maxLength, String fallback) {
        String text = value == null ? "" : value.trim();
        if (text.length() == 0) return fallback;
        return text.length() <= maxLength ? text : text.substring(0, maxLength);
    }

    private static int bounded(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    private static <T> List<T> immutableList(List<T> values) {
        return Collections.unmodifiableList(new ArrayList<>(values));
    }

    private static <T> Set<T> immutableSet(Set<T> values) {
        return Collections.unmodifiableSet(new LinkedHashSet<>(values));
    }

    static final class ShareTarget {
        final String label;
        final String packageName;
        final boolean primary;

        ShareTarget(String label, String packageName, boolean primary) {
            this.label = label;
            this.packageName = packageName;
            this.primary = primary;
        }

        JSONObject toJson() throws JSONException {
            JSONObject object = new JSONObject();
            object.put("label", label);
            object.put("package", packageName);
            object.put("primary", primary);
            return object;
        }
    }

    static final class SourceRule {
        final String contains;
        final String label;

        SourceRule(String contains, String label) {
            this.contains = contains == null ? "" : contains.toLowerCase(Locale.US);
            this.label = label;
        }

        JSONObject toJson() throws JSONException {
            JSONObject object = new JSONObject();
            object.put("contains", contains);
            object.put("label", label);
            return object;
        }
    }
}
