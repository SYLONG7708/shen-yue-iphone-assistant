const MANIFEST_PROPERTY_KEY = "shen_yue_update_manifest";

function doGet(e) {
  const type = e && e.parameter ? e.parameter.type || e.parameter.action : "";
  if (type === "updates") {
    return jsonOutput(getStoredManifest());
  }

  return jsonOutput({
    ok: true,
    message: "申悅更新中心低權限雲端 API 已啟用",
    updateManifest: "?type=updates"
  });
}

function doPost(e) {
  try {
    const payload = parsePayload(e);
    if (payload.type === "replace-update-manifest") {
      return jsonOutput(replaceManifest(payload.manifest));
    }
    if (payload.type === "update-center-app") {
      return jsonOutput(saveUpdateApp(payload));
    }
    if (payload.type === "delete-update-app") {
      return jsonOutput(deleteUpdateApp(payload));
    }
    return jsonOutput({
      ok: true,
      message: "低權限模式未寫入保固試算表；請使用更新中心上傳或 GitHub 發布工具。"
    });
  } catch (error) {
    return jsonOutput({
      ok: false,
      message: error.message
    });
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("沒有收到上傳內容");
  }
  return JSON.parse(e.postData.contents);
}

function getStoredManifest() {
  const text = PropertiesService.getScriptProperties().getProperty(MANIFEST_PROPERTY_KEY);
  if (text) {
    try {
      return normalizeManifest(JSON.parse(text));
    } catch (error) {
      return emptyManifest("stored-manifest-parse-error");
    }
  }
  return emptyManifest("empty");
}

function replaceManifest(manifest) {
  const normalized = normalizeManifest(manifest || {});
  setStoredManifest(normalized);
  return {
    ok: true,
    message: "更新清單已整批替換",
    manifest: normalized,
    apps: normalized.apps.length
  };
}

function saveUpdateApp(payload) {
  const updateApp = payload.updateApp || payload;
  const manifest = getStoredManifest();
  const existingItem = findExistingItem(manifest.apps, updateApp);
  const item = buildManifestItem(updateApp, existingItem);

  if (!item.apkUrl) {
    throw new Error("低權限自動同步模式不能保存 APK 檔案，請先使用 GitHub Release 或其他公開下載網址，再填入 APK 下載地址。");
  }

  manifest.apps = mergeApps([item], manifest.apps);
  manifest.updatedAt = formatManifestTime(new Date());
  setStoredManifest(manifest);

  return {
    ok: true,
    message: "更新中心資料已同步",
    row: manifest.apps.length,
    item,
    data: item
  };
}

function deleteUpdateApp(payload) {
  const target = payload.target || payload.updateApp || payload;
  const manifest = getStoredManifest();
  const existingItem = findExistingItem(manifest.apps, target);

  if (!existingItem) {
    throw new Error("找不到要刪除的更新項目。");
  }

  const deleteKey = normalizeItemId(existingItem.packageName || existingItem.id || existingItem.name || existingItem.apkUrl);
  manifest.apps = manifest.apps.filter((item) => {
    const key = normalizeItemId(item.packageName || item.id || item.name || item.apkUrl);
    return key !== deleteKey;
  });
  manifest.updatedAt = formatManifestTime(new Date());
  setStoredManifest(manifest);

  return {
    ok: true,
    message: "更新項目已移除",
    deleted: true,
    item: existingItem,
    apps: manifest.apps.length,
    manifest
  };
}

function setStoredManifest(manifest) {
  const text = JSON.stringify(normalizeManifest(manifest));
  PropertiesService.getScriptProperties().setProperty(MANIFEST_PROPERTY_KEY, text);
}

function normalizeManifest(manifest) {
  return {
    schema: 1,
    channel: manifest.channel || "stable",
    updatedAt: manifest.updatedAt || formatManifestTime(new Date()),
    source: "apps-script-properties",
    apps: Array.isArray(manifest.apps) ? manifest.apps.filter(Boolean) : []
  };
}

function emptyManifest(reason) {
  return {
    schema: 1,
    channel: "stable",
    updatedAt: formatManifestTime(new Date()),
    source: "apps-script-properties",
    reason,
    apps: []
  };
}

function mergeApps(primaryApps, fallbackApps) {
  const result = [];
  const seen = {};

  primaryApps.concat(fallbackApps).forEach((item) => {
    if (!item) return;
    const key = normalizeItemId(item.packageName || item.id || item.name || item.apkUrl);
    if (seen[key]) return;
    seen[key] = true;
    result.push(item);
  });

  return result;
}

function findExistingItem(apps, row) {
  const keys = [
    row.manifestId,
    row.packageName,
    row.appName,
    row.name,
    row.apkUrl
  ].filter(Boolean).map((value) => String(value).trim()).filter(Boolean);

  return apps.find((item) => keys.some((key) => (
    item.id === key ||
    item.packageName === key ||
    item.name === key ||
    normalizeItemId(item.packageName || item.id || item.name || item.apkUrl) === normalizeItemId(key)
  ))) || null;
}

function buildManifestItem(row, existingItem) {
  const existingGalleryImages = Array.isArray(existingItem && existingItem.galleryImages) ? existingItem.galleryImages : [];
  const firstImageUrl = row.firstImageUrl || existingGalleryImages[0] || (existingItem && existingItem.imageUrl) || "";
  const secondImageUrl = row.secondImageUrl || existingGalleryImages[1] || "";
  const apkUrl = row.apkUrl || (existingItem && existingItem.apkUrl) || "";
  const versionCode = Number(row.versionCode || (existingItem && existingItem.versionCode) || 0);

  return {
    id: row.manifestId || (existingItem && existingItem.id) || normalizeItemId(row.packageName || row.appName || row.name || apkUrl),
    name: row.appName || row.name || (existingItem && existingItem.name) || getFallbackName(apkUrl),
    category: row.category || (existingItem && existingItem.category) || "其他應用",
    packageName: row.packageName || (existingItem && existingItem.packageName) || "",
    versionCode: Number.isFinite(versionCode) ? versionCode : 0,
    versionName: row.versionName || (existingItem && existingItem.versionName) || "未標示",
    minAndroid: row.minAndroid || (existingItem && existingItem.minAndroid) || "依 APK 設定",
    targetSdk: row.targetSdk || (existingItem && existingItem.targetSdk) || "",
    sizeLabel: row.sizeLabel || (existingItem && (existingItem.sizeLabel || existingItem.size)) || "",
    apkUrl,
    sha256: row.sha256 || (existingItem && existingItem.sha256) || "",
    imageUrl: firstImageUrl || secondImageUrl || "",
    iconUrl: row.iconUrl || (existingItem && existingItem.iconUrl) || "assets/app-logo.png",
    galleryImages: [firstImageUrl, secondImageUrl].filter(Boolean),
    description: row.description || (existingItem && (existingItem.description || existingItem.introduction || existingItem.note)) || "此 APK 尚未填寫介紹。",
    changelog: [
      "已由更新中心自動同步",
      row.category ? "分類：" + row.category : "",
      "可在車機內下載安裝"
    ].filter(Boolean)
  };
}

function getFallbackName(apkUrl) {
  const text = String(apkUrl || "").trim();
  if (!text) return "未命名 APK";
  const clean = text.split("?")[0].split("#")[0];
  const rawName = clean.split("/").filter(Boolean).pop() || "";
  let name = rawName;
  try {
    name = decodeURIComponent(rawName);
  } catch (error) {
    name = rawName;
  }
  return name.replace(/\.apk$/i, "") || "未命名 APK";
}

function normalizeItemId(value) {
  const source = String(value || "shen-yue-app").trim();
  const text = source.toLowerCase();
  const normalized = text
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (normalized) return normalized;

  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return "shen-yue-app-" + Math.abs(hash).toString(36);
}

function formatManifestTime(date) {
  return Utilities.formatDate(date, "Asia/Taipei", "yyyy-MM-dd'T'HH:mm:ssZ")
    .replace(/(\d{2})(\d{2})$/, "$1:$2");
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
