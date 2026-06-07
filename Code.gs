const SPREADSHEET_ID = "";
const WARRANTY_SHEET_NAME = "保固上傳";
const UPDATE_SHEET_NAME = "更新中心上傳";
const UPDATE_UPLOAD_FOLDER_NAME = "申悅更新中心上傳";
const FALLBACK_UPDATE_MANIFEST_URL = "https://raw.githubusercontent.com/SYLONG7708/update/main/updates.json";

const WARRANTY_HEADERS = [
  "上傳時間",
  "車主姓名",
  "車主電話",
  "車牌號碼",
  "車款年分",
  "主機規格",
  "安裝項目 / 其他產品類別",
  "總金額",
  "安裝日期",
  "保固到期日",
  "備註"
];

const UPDATE_HEADERS = [
  "上傳時間",
  "應用圖標網址",
  "應用圖標檔案",
  "應用名稱",
  "類別名稱",
  "應用介紹",
  "第一張圖片網址",
  "第一張圖片檔案",
  "第二張圖片網址",
  "第二張圖片檔案",
  "APK下載地址",
  "APK檔案",
  "App容量",
  "套件名稱",
  "版本名稱",
  "版本碼",
  "最低Android",
  "目標SDK",
  "SHA-256",
  "更新清單JSON",
  "備註"
];

function doGet(e) {
  const type = e && e.parameter ? e.parameter.type || e.parameter.action : "";
  if (type === "updates") {
    return jsonOutput(buildUpdateManifest());
  }

  return jsonOutput({
    ok: true,
    message: "申悅雲端上傳 API 已啟用",
    sheets: [WARRANTY_SHEET_NAME, UPDATE_SHEET_NAME],
    updateManifest: "?type=updates"
  });
}

function doPost(e) {
  try {
    const payload = parsePayload(e);
    if (payload.type === "update-center-app") {
      return jsonOutput(saveUpdateApp(payload));
    }
    return jsonOutput(saveWarranty(payload));
  } catch (error) {
    return jsonOutput({
      ok: false,
      message: error.message
    });
  }
}

function saveWarranty(payload) {
  const sheet = getSheet(WARRANTY_SHEET_NAME);
  ensureWarrantySheetLayout(sheet);

  const rowData = buildWarrantyRow(payload);
  sheet.appendRow(rowData);

  const row = sheet.getLastRow();
  formatWarrantyDataRow(sheet, row);

  return {
    ok: true,
    message: "保固資料已上傳",
    row,
    data: objectFromHeaders(rowData, WARRANTY_HEADERS)
  };
}

function saveUpdateApp(payload) {
  const sheet = getSheet(UPDATE_SHEET_NAME);
  ensureUpdateSheetLayout(sheet);

  const updateApp = payload.updateApp || payload;
  const files = payload.files || {};
  const hasFiles = Object.keys(files).some((key) => files[key] && files[key].dataUrl);
  const savedFiles = hasFiles ? saveUpdateFiles(updateApp, files, getUpdateUploadFolder()) : {};
  const existingItem = findExistingUpdateManifestItem(updateApp);
  const manifestItem = buildUpdateManifestItem(updateApp, savedFiles, existingItem);
  const rowData = buildUpdateRow(mergeUpdateRowForSheet(updateApp, manifestItem), savedFiles, manifestItem);

  sheet.appendRow(rowData);
  const row = sheet.getLastRow();
  formatUpdateDataRow(sheet, row);

  return {
    ok: true,
    message: "更新中心資料已上傳",
    row,
    item: manifestItem,
    data: objectFromHeaders(rowData, UPDATE_HEADERS)
  };
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("沒有收到上傳內容");
  }
  return JSON.parse(e.postData.contents);
}

function getSpreadsheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("找不到試算表，請綁定試算表或填入 SPREADSHEET_ID");
  }

  return spreadsheet;
}

function getSheet(name) {
  const spreadsheet = getSpreadsheet();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function getSheetIfExists(name) {
  return getSpreadsheet().getSheetByName(name);
}

function ensureWarrantySheetLayout(sheet) {
  ensureHeaderLayout(sheet, WARRANTY_HEADERS);
  sheet.setColumnWidths(1, WARRANTY_HEADERS.length, 190);
  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(5, 230);
  sheet.setColumnWidth(6, 260);
  sheet.setColumnWidth(7, 300);
  sheet.setColumnWidth(8, 180);
  sheet.setColumnWidth(11, 420);
}

function ensureUpdateSheetLayout(sheet) {
  ensureHeaderLayout(sheet, UPDATE_HEADERS);
  sheet.setColumnWidths(1, UPDATE_HEADERS.length, 180);
  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 420);
  sheet.setColumnWidth(11, 360);
  sheet.setColumnWidth(12, 360);
  sheet.setColumnWidth(20, 520);
  sheet.setColumnWidth(21, 320);
}

function ensureHeaderLayout(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsHeader = currentHeaders.join("") === "" || currentHeaders.join("|") !== headers.join("|");

  if (needsHeader) {
    headerRange.setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 52);

  headerRange
    .setFontWeight("bold")
    .setFontSize(12)
    .setFontColor("#071018")
    .setBackground("#dff6ff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), headers.length)
    .setWrap(true)
    .setVerticalAlignment("top");
}

function buildWarrantyRow(payload) {
  const row = payload.spreadsheetRow || payload;
  return [
    formatUploadTime(new Date()),
    row.owner || payload.owner || "",
    row.phone || payload.phone || "",
    row.plate || payload.plate || "",
    row.car || payload.car || "",
    row.model || payload.model || payload.productSpec || "",
    row.items || payload.items || row.otherProduct || payload.otherProduct || payload.customProduct || payload.otherInstallProduct || "",
    row.totalAmount || payload.totalAmount || "",
    row.installDate || payload.installDate || "",
    row.warrantyDate || payload.warrantyDate || "",
    row.note || payload.note || ""
  ];
}

function buildUpdateRow(row, savedFiles, manifestItem) {
  const iconFileUrl = getFileSheetUrl(savedFiles.icon);
  const firstImageFileUrl = getFileSheetUrl(savedFiles.firstImage);
  const secondImageFileUrl = getFileSheetUrl(savedFiles.secondImage);
  const apkFileUrl = getFileDownloadUrl(savedFiles.apk);

  return [
    formatUploadTime(new Date()),
    iconFileUrl || row.iconUrl || "",
    iconFileUrl,
    row.appName || row.name || "",
    row.category || "",
    row.description || "",
    firstImageFileUrl || row.firstImageUrl || "",
    firstImageFileUrl,
    secondImageFileUrl || row.secondImageUrl || "",
    secondImageFileUrl,
    apkFileUrl || row.apkUrl || "",
    apkFileUrl,
    row.sizeLabel || fileSizeLabel(savedFiles.apk && savedFiles.apk.size) || "",
    row.packageName || "",
    row.versionName || "",
    row.versionCode || "",
    row.minAndroid || "",
    row.targetSdk || "",
    row.sha256 || "",
    JSON.stringify(manifestItem),
    row.note || ""
  ];
}

function mergeUpdateRowForSheet(row, manifestItem) {
  const galleryImages = Array.isArray(manifestItem.galleryImages) ? manifestItem.galleryImages : [];
  return {
    ...row,
    iconUrl: row.iconUrl || manifestItem.iconUrl || "",
    appName: row.appName || row.name || manifestItem.name || "",
    category: row.category || manifestItem.category || "",
    description: row.description || manifestItem.description || "",
    firstImageUrl: row.firstImageUrl || galleryImages[0] || manifestItem.imageUrl || "",
    secondImageUrl: row.secondImageUrl || galleryImages[1] || "",
    apkUrl: row.apkUrl || manifestItem.apkUrl || "",
    sizeLabel: row.sizeLabel || manifestItem.sizeLabel || "",
    packageName: row.packageName || manifestItem.packageName || "",
    versionName: row.versionName || manifestItem.versionName || "",
    versionCode: row.versionCode || manifestItem.versionCode || "",
    minAndroid: row.minAndroid || manifestItem.minAndroid || "",
    targetSdk: row.targetSdk || manifestItem.targetSdk || "",
    sha256: row.sha256 || manifestItem.sha256 || ""
  };
}

function formatWarrantyDataRow(sheet, row) {
  formatDataRow(sheet, row, WARRANTY_HEADERS.length);
  sheet.setRowHeight(row, 86);
  sheet.getRange(row, 8).setNumberFormat("#,##0");
}

function formatUpdateDataRow(sheet, row) {
  formatDataRow(sheet, row, UPDATE_HEADERS.length);
  sheet.setRowHeight(row, 112);
}

function formatDataRow(sheet, row, columnCount) {
  sheet.getRange(row, 1, 1, columnCount)
    .setFontSize(12)
    .setFontColor("#111827")
    .setBackground("#ffffff")
    .setHorizontalAlignment("left")
    .setVerticalAlignment("top")
    .setWrap(true);
}

function saveUpdateFiles(row, files, folder) {
  return {
    icon: saveUploadFile(files.icon, folder, buildUploadFileName(row, "icon")),
    firstImage: saveUploadFile(files.firstImage, folder, buildUploadFileName(row, "photo-1")),
    secondImage: saveUploadFile(files.secondImage, folder, buildUploadFileName(row, "photo-2")),
    apk: saveUploadFile(files.apk, folder, buildUploadFileName(row, "app"))
  };
}

function saveUploadFile(filePayload, folder, fallbackName) {
  if (!filePayload || !filePayload.dataUrl) return null;

  const parsed = parseDataUrl(filePayload.dataUrl, filePayload.type);
  const fileName = uniqueFileName(filePayload.name || fallbackName);
  const blob = Utilities.newBlob(Utilities.base64Decode(parsed.base64), parsed.mimeType, fileName);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    // Some Google Workspace policies block public sharing; the sheet still records the Drive file URL.
  }

  return {
    id: file.getId(),
    name: file.getName(),
    type: parsed.mimeType,
    size: file.getSize(),
    url: file.getUrl(),
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + file.getId()
  };
}

function parseDataUrl(dataUrl, fallbackMimeType) {
  const text = String(dataUrl || "");
  const match = text.match(/^data:([^;]+);base64,(.+)$/);
  return {
    mimeType: match ? match[1] : fallbackMimeType || "application/octet-stream",
    base64: (match ? match[2] : text).replace(/\s/g, "")
  };
}

function getUpdateUploadFolder() {
  const folders = DriveApp.getFoldersByName(UPDATE_UPLOAD_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(UPDATE_UPLOAD_FOLDER_NAME);
}

function buildUploadFileName(row, suffix) {
  const base = normalizeUpdateItemId(row.packageName || row.appName || row.name || "shen-yue-app");
  return base + "-" + suffix;
}

function uniqueFileName(name) {
  return formatUploadTimeForFile(new Date()) + "-" + sanitizeFileName(name || "upload-file");
}

function sanitizeFileName(name) {
  return String(name || "upload-file").replace(/[\\/:*?"<>|#%{}~&]+/g, "-").trim() || "upload-file";
}

function getFileSheetUrl(file) {
  return file ? file.url || file.downloadUrl || "" : "";
}

function getFileDownloadUrl(file) {
  return file ? file.downloadUrl || file.url || "" : "";
}

function buildUpdateManifest() {
  const fallbackManifest = loadFallbackUpdateManifest();
  const uploadedApps = getUploadedUpdateApps();
  const fallbackApps = Array.isArray(fallbackManifest.apps) ? fallbackManifest.apps : [];

  return {
    schema: 1,
    channel: fallbackManifest.channel || "stable",
    updatedAt: formatManifestTime(new Date()),
    apps: mergeUpdateApps(uploadedApps, fallbackApps)
  };
}

function loadFallbackUpdateManifest() {
  try {
    const response = UrlFetchApp.fetch(FALLBACK_UPDATE_MANIFEST_URL, { muteHttpExceptions: true });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return { apps: [] };
    return JSON.parse(response.getContentText() || "{}");
  } catch (error) {
    return { apps: [] };
  }
}

function getUploadedUpdateApps() {
  const sheet = getSheetIfExists(UPDATE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getRange(1, 1, sheet.getLastRow(), UPDATE_HEADERS.length).getValues();
  const headers = values[0];
  const jsonIndex = headers.indexOf("更新清單JSON");

  return values.slice(1).reverse().map((row) => {
    const jsonText = jsonIndex >= 0 ? row[jsonIndex] : "";
    if (jsonText) {
      try {
        return JSON.parse(jsonText);
      } catch (error) {
        return null;
      }
    }
    return buildUpdateManifestItem(rowObjectFromHeaders(row, headers), {});
  }).filter(Boolean);
}

function mergeUpdateApps(primaryApps, fallbackApps) {
  const result = [];
  const seen = {};

  primaryApps.concat(fallbackApps).forEach((item) => {
    if (!item) return;
    const key = normalizeUpdateItemId(item.packageName || item.id || item.name);
    if (seen[key]) return;
    seen[key] = true;
    result.push(item);
  });

  return result;
}

function findExistingUpdateManifestItem(row) {
  const keys = [
    row.manifestId,
    row.packageName,
    row.appName,
    row.name,
    row.apkUrl
  ].filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
  if (!keys.length) return null;

  const fallbackManifest = loadFallbackUpdateManifest();
  const apps = getUploadedUpdateApps().concat(Array.isArray(fallbackManifest.apps) ? fallbackManifest.apps : []);

  return apps.find((item) => {
    if (!item) return false;
    return keys.some((key) => (
      item.id === key ||
      item.packageName === key ||
      item.name === key ||
      normalizeUpdateItemId(item.packageName || item.id || item.name || item.apkUrl) === normalizeUpdateItemId(key)
    ));
  }) || null;
}

function buildUpdateManifestItem(row, savedFiles, existingItem) {
  const existingGalleryImages = Array.isArray(existingItem && existingItem.galleryImages) ? existingItem.galleryImages : [];
  const iconUrl = getFileDownloadUrl(savedFiles.icon) || row.iconUrl || (existingItem && existingItem.iconUrl) || "";
  const firstImageUrl = getFileDownloadUrl(savedFiles.firstImage) || row.firstImageUrl || existingGalleryImages[0] || (existingItem && existingItem.imageUrl) || "";
  const secondImageUrl = getFileDownloadUrl(savedFiles.secondImage) || row.secondImageUrl || existingGalleryImages[1] || "";
  const apkUrl = getFileDownloadUrl(savedFiles.apk) || row.apkUrl || (existingItem && existingItem.apkUrl) || "";
  const galleryImages = [firstImageUrl, secondImageUrl].filter(Boolean);
  const versionCode = Number(row.versionCode || (existingItem && existingItem.versionCode) || 0);

  return {
    id: row.manifestId || (existingItem && existingItem.id) || normalizeUpdateItemId(row.packageName || row.appName || row.name || row.apkUrl),
    name: row.appName || row.name || (existingItem && existingItem.name) || getFallbackUpdateName(apkUrl),
    category: row.category || (existingItem && existingItem.category) || "其他應用",
    packageName: row.packageName || (existingItem && existingItem.packageName) || "",
    versionCode: Number.isFinite(versionCode) ? versionCode : 0,
    versionName: row.versionName || (existingItem && existingItem.versionName) || "未標示",
    minAndroid: row.minAndroid || (existingItem && existingItem.minAndroid) || "依 APK 設定",
    targetSdk: row.targetSdk || (existingItem && existingItem.targetSdk) || "",
    sizeLabel: row.sizeLabel || fileSizeLabel(savedFiles.apk && savedFiles.apk.size) || (existingItem && (existingItem.sizeLabel || existingItem.size)) || "",
    apkUrl,
    sha256: row.sha256 || (existingItem && existingItem.sha256) || "",
    imageUrl: firstImageUrl || secondImageUrl || "",
    iconUrl: iconUrl || "assets/app-logo.png",
    galleryImages,
    description: row.description || (existingItem && (existingItem.description || existingItem.introduction || existingItem.note)) || "此 APK 尚未填寫介紹。",
    changelog: [
      "已由更新中心上傳表格新增",
      row.category ? "分類：" + row.category : "",
      "可在車機內下載安裝"
    ].filter(Boolean)
  };
}

function getFallbackUpdateName(apkUrl) {
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

function normalizeUpdateItemId(value) {
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

function fileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size >= 1024 * 1024 * 1024) return (size / 1024 / 1024 / 1024).toFixed(2) + " GB";
  if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + " MB";
  if (size >= 1024) return Math.round(size / 1024) + " KB";
  return size + " B";
}

function formatUploadTime(date) {
  const timezone = Session.getScriptTimeZone() || "Asia/Taipei";
  return Utilities.formatDate(date, timezone, "yyyy/MM/dd HH:mm:ss");
}

function formatUploadTimeForFile(date) {
  const timezone = Session.getScriptTimeZone() || "Asia/Taipei";
  return Utilities.formatDate(date, timezone, "yyyyMMdd-HHmmss");
}

function formatManifestTime(date) {
  const timezone = Session.getScriptTimeZone() || "Asia/Taipei";
  return Utilities.formatDate(date, timezone, "yyyy-MM-dd'T'HH:mm:ssZ")
    .replace(/(\d{2})(\d{2})$/, "$1:$2");
}

function objectFromHeaders(rowData, headers) {
  return headers.reduce((result, header, index) => {
    result[header] = rowData[index];
    return result;
  }, {});
}

function rowObjectFromHeaders(rowData, headers) {
  const object = {};
  headers.forEach((header, index) => {
    object[header] = rowData[index];
  });
  return {
    iconUrl: object["應用圖標網址"] || "",
    appName: object["應用名稱"] || "",
    category: object["類別名稱"] || "",
    description: object["應用介紹"] || "",
    firstImageUrl: object["第一張圖片網址"] || object["第一張圖片檔案"] || "",
    secondImageUrl: object["第二張圖片網址"] || object["第二張圖片檔案"] || "",
    apkUrl: object["APK下載地址"] || object["APK檔案"] || "",
    sizeLabel: object["App容量"] || "",
    packageName: object["套件名稱"] || "",
    versionName: object["版本名稱"] || "",
    versionCode: object["版本碼"] || "",
    minAndroid: object["最低Android"] || "",
    targetSdk: object["目標SDK"] || "",
    sha256: object["SHA-256"] || ""
  };
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
