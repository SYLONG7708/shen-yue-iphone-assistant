const recordForm = document.querySelector("[data-record-form]");
const recordCard = document.querySelector("[data-record-card]");
const checklist = document.querySelector("[data-checklist]");
const installButton = document.querySelector("[data-install]");
const cloudStatus = document.querySelector("[data-cloud-status]");
const adminPanel = document.querySelector("[data-admin-panel]");
const adminOutput = document.querySelector("[data-admin-output]");
const adminShortcut = document.querySelector("[data-admin-shortcut]");
const videoGrid = document.querySelector("[data-video-grid]");
const videoSearch = document.querySelector("[data-video-search]");
const serviceGrid = document.querySelector("[data-service-grid]");
const updateUrlInput = document.querySelector("[data-update-url]");
const updateStatus = document.querySelector("[data-update-status]");
const updateDevice = document.querySelector("[data-update-device]");
const updateList = document.querySelector("[data-update-list]");
const updateDetail = document.querySelector("[data-update-detail]");
const updateUploadCard = document.querySelector("[data-update-upload-card]");
const updateUploadForm = document.querySelector("[data-update-upload-form]");
const updateUploadStatus = document.querySelector("[data-update-upload-status]");

const storageKey = "shenYueCarRecord";
const checklistKey = "shenYueDeliveryChecklist";
const adminKey = "shenYueAdminSettings";
const updateUrlKey = "shenYueUpdateManifestUrl";
const updateUploadKey = "shenYueLastUpdateUpload";
const localUpdateOverridesKey = "shenYueLocalUpdateOverrides";
const adminPinHash = "7c5fab57f8c1447f91f98eb3fcea7954e4f704d92686c5fd2e551e34ca88f8a8";
const fallbackAdminPin = String.fromCharCode(55, 55, 48, 56);
const defaultCloudDeploymentId = "AKfycbwrUCUeksZrWOUSDrdKgUGTS1JIPRX3c18PIKgZu_j64jBZGXjI7rnHTFjmIqUljZFzeg";
const defaultCloudEndpoint = `https://script.google.com/macros/s/${defaultCloudDeploymentId}/exec`;
const defaultWarrantyDeploymentId = "AKfycbwlvaUogloZ92oqn_itLds13EizVYD05BBduB1eDWxEIGsq5yu7vvWUSCgfCMAF9ydL";
const defaultWarrantyEndpoint = `https://script.google.com/macros/s/${defaultWarrantyDeploymentId}/exec`;
const defaultContentConfigUrl = "shen-yue-assistant-content.json";
const legacyUpdateManifestUrl = "https://sylong7708.github.io/shen-yue-iphone-assistant/updates.json";
const fallbackUpdateManifestUrl = "https://raw.githubusercontent.com/SYLONG7708/update/main/updates.json";
const defaultUpdateManifestUrl = `${defaultCloudEndpoint}?type=updates`;
const defaultApkReleaseTagUrl = "https://github.com/SYLONG7708/update/releases/tag/apk-cloud";
const defaultApkReleaseDownloadBase = "https://github.com/SYLONG7708/update/releases/download/apk-cloud/";
const maxInlineImageUploadBytes = 8 * 1024 * 1024;
const maxInlineApkUploadBytes = 24 * 1024 * 1024;
const isAndroidApk = /\bShenYueAndroidApk\//i.test(navigator.userAgent || "");
const tabScrollBehavior = isAndroidApk ? "auto" : "smooth";
const updateUploadFileTargets = {
  iconFile: { fieldName: "iconUrl", kind: "image", label: "應用圖標" },
  firstImageFile: { fieldName: "firstImageUrl", kind: "image", label: "第一張圖片" },
  secondImageFile: { fieldName: "secondImageUrl", kind: "image", label: "第二張圖片" },
  apkFile: { fieldName: "apkUrl", kind: "apk", label: "小 APK" }
};
const currentLineId = "@585eeefp";
const legacyLineIds = new Set(["7708LUNG", "@7708LUNG", "7708lung", "@7708lung"]);
const legacyCloudDeploymentIds = new Set([
  "AKfycbxcIrA3syOcg6qCriinVl5KoUt20EnkOIdrW6kXM1OSM5dFZq1qUISkU8Ke8NJQPWuz",
  "AKfycbxxtXq2JnoqYHU7rHDo4Ddfe_ZfPzwDolglZsbBmY2j1YUkV1fbqcFv8KhNh-stPL8",
  "AKfycbzV2bw_y88ix-g5k_X1afwRNi-8MvYVAnUDezevLe4oQvKrdnjnFp8iqeDFu5Fcqh7t6A"
]);

if (isAndroidApk) {
  document.documentElement.classList.add("android-apk");
}
const legacyCloudEndpoints = new Set([
  "https://script.google.com/macros/s/AKfycbxcIrA3syOcg6qCriinVl5KoUt20EnkOIdrW6kXM1OSM5dFZq1qUISkU8Ke8NJQPWuz/exec",
  "https://script.google.com/macros/s/AKfycbxxtXq2JnoqYHU7rHDo4Ddfe_ZfPzwDolglZsbBmY2j1YUkV1fbqcFv8KhNh-stPL8/exec"
]);
const warrantyCloudDeploymentIds = new Set([
  defaultWarrantyDeploymentId,
  "AKfycbz3z5n_rNoBqCv_YtqiGRXlCVPmQWDiqZsrTLs_nquZpjPu5MJWKtXlMz5bDTJlPmLV",
  "AKfycbyhMg4hQ2gsCQMw_WT1lmuW9uihqrBBk1PmaUBqimya0CNVcJxTW6OLeLyjjbtj40Y-"
]);
const warrantyModelOptions = [
  "SY-C4 四核 2g+32g",
  "SY-B8 八核 2g+64g",
  "SY-A8 八核 4g+64g",
  "SY-K8 八核 8g+128g",
  "SY-X8 八核 8g+256g",
  "SY-Z13 八核 8g+256g（13吋）",
  "SY-A8-V 八核 4g+64g（環景）",
  "SY-K8-V 八核 8g+128g（環景）",
  "SY-X8-V 八核 8g+256g（環景）",
  "SY-Z13-V 八核 8g+256g（13吋環景）"
];
const warrantyModelSet = new Set(warrantyModelOptions);
let deferredInstallPrompt = null;
let activeVideoCategory = "all";
let lastRemoteContentCheck = 0;
let updateCenterLoaded = false;
let currentUpdateItems = [];
let currentInstalledMap = new Map();
let currentUpdateManifestUrl = "updates.json";
let lastFocusedVideoTrigger = null;
let updateEditorUnlocked = false;
let adminUnlocked = false;
let lastParsedUploadApk = null;
let updateUploadApkInspectionId = 0;

const defaultContent = {
  heroTitle: "車機教學、保固資料、售後聯絡。",
  services: [
    { number: "01", title: "車載安卓機", description: "13 吋高解析大螢幕升級，整合導航、影音、CarPlay、倒車顯影與原車控制，讓車艙變成直覺好用的智慧中控。", iconClass: "custom-icon android-icon" },
    { number: "02", title: "360 環景系統", description: "四鏡頭全景輔助搭配專業校正，停車、窄巷、會車更有掌握，降低視線死角與碰撞風險。", iconClass: "custom-icon surround-icon" },
    { number: "03", title: "行車記錄器", description: "前後雙錄與車機整合，清楚保存行車關鍵畫面，安裝走線俐落，日常通勤與長途行車都更安心。", iconClass: "custom-icon dashcam-icon" },
    { number: "04", title: "汽車音響", description: "喇叭、DSP、擴大機與隔音制震整體規劃，依車艙空間調整音場，讓音樂細節、層次與低頻更有質感。", iconClass: "custom-icon audio-icon" },
    { number: "05", title: "電動尾門", description: "支援按鍵、遙控與高度記憶設定，開關更便利，施工依車款整合原車訊號，兼顧安全與使用質感。", iconClass: "custom-icon tailgate-icon" },
    { number: "06", title: "盲點偵測", description: "後視鏡警示與雷達偵測輔助變換車道，提醒側後方來車，提升高速、公路與市區行駛安全。", iconClass: "custom-icon blind-icon" }
  ]
};

const surroundTutorialPlaylistTitle = "環景教學播放清單";
const surroundTutorialPlaylistKey = "surround-view";
const surroundTutorialVideos = [
  { title: "該如何下載環景影像｜主機調閱｜電腦存放", category: "設定", url: "https://youtu.be/1SUlHDdkxPM", playlistKey: surroundTutorialPlaylistKey, playlistTitle: surroundTutorialPlaylistTitle },
  { title: "該如何知道環景是否有在錄製｜真的很重要", category: "設定", url: "https://youtu.be/h-BnxenbwyQ", playlistKey: surroundTutorialPlaylistKey, playlistTitle: surroundTutorialPlaylistTitle },
  { title: "教你如何更改環景車型｜顏色｜車牌號碼", category: "設定", url: "https://youtu.be/XW1fcxNh1xo", playlistKey: surroundTutorialPlaylistKey, playlistTitle: surroundTutorialPlaylistTitle },
  { title: "環景設定倒車軌跡樣式", category: "設定", url: "https://youtu.be/S6tRHKrkIVE", playlistKey: surroundTutorialPlaylistKey, playlistTitle: surroundTutorialPlaylistTitle },
  { title: "教你如何主機直接格式化環景記憶卡", category: "設定", url: "https://youtu.be/UDWqB1Di_RU", playlistKey: surroundTutorialPlaylistKey, playlistTitle: surroundTutorialPlaylistTitle },
  { title: "環景原車設置大全－基本功教學", category: "設定", url: "https://youtu.be/vcUqtftG2Uc", playlistKey: surroundTutorialPlaylistKey, playlistTitle: surroundTutorialPlaylistTitle }
];

const videos = [
  { title: "新 UI 介面", category: "介面", url: "https://youtu.be/ir2H40ENsKY?si=B3FHIlE9rz7aLW7m" },
  { title: surroundTutorialPlaylistTitle, category: "設定", url: surroundTutorialVideos[0].url, playlistKey: surroundTutorialPlaylistKey, playlistTitle: surroundTutorialPlaylistTitle, playlistItems: surroundTutorialVideos },
  { title: "樂克導航（免開網路）", category: "導航", url: "https://youtu.be/k9laYNbPRVI?si=Btzhb4ISUNE-7e1A" },
  { title: "iPhone 連接網路", category: "連線", url: "https://youtu.be/xJgQTR-GbN8" },
  { title: "iPhone 連接藍芽", category: "連線", url: "https://youtu.be/fVOtS2oUsqY" },
  { title: "Android Auto 使用", category: "連線", url: "https://youtu.be/TecO-20i3Pw" },
  { title: "Apple CarPlay 使用", category: "連線", url: "https://youtu.be/JEAjZBDokhU" },
  { title: "使用隨身碟聽音樂", category: "影音", url: "https://youtu.be/jHSQ7cxW7nw" },
  { title: "電台存取", category: "影音", url: "https://youtu.be/Ra_2am4m5Ck" },
  { title: "調整亮度", category: "設定", url: "https://youtu.be/ALDFaQSQJFA" },
  { title: "神盾測速照相", category: "導航", url: "https://youtu.be/9O96HSQbNvc" },
  { title: "尋找應用程式", category: "介面", url: "https://youtu.be/kTzVXGc-f5g" },
  { title: "2024 申悅更新站", category: "設定", url: "https://youtu.be/pkBAlJrBwVE?si=REzKfead9FvQaNdD" },
  { title: "分屏模式教學 - 安卓 13", category: "介面", url: "https://youtu.be/B2whM6w4VCI" },
  { title: "分屏模式", category: "介面", url: "https://youtu.be/IbuzzVY6EVc" },
  { title: "Google 語音搜尋", category: "導航", url: "https://youtu.be/DROmImKCRNg" },
  { title: "安卓機桌布更換", category: "介面", url: "https://youtu.be/BcVmxELU4hU" },
  { title: "iPhone 網路重置", category: "故障排除", url: "https://youtu.be/lNMnJmawFXk" },
  { title: "觸控校正", category: "故障排除", url: "https://youtu.be/jvoYxWxzf90" },
  { title: "APP 自動啟動", category: "設定", url: "https://youtu.be/aq6SUYLWJto" },
  { title: "安卓機秒開模式", category: "設定", url: "https://youtu.be/P5jIoubuB7Y" },
  { title: "螢幕亮度內建再次調整", category: "設定", url: "https://youtu.be/s3KGI2J_TB4" },
  { title: "倒車顯影顛倒", category: "故障排除", url: "https://youtu.be/sL2oFKqVRNY" },
  { title: "方向盤設定", category: "設定", url: "https://youtu.be/esI70gCzASU" },
  { title: "主機當機重啟", category: "故障排除", url: "https://youtu.be/C9Qs85Un8lY?si=dE5VO4_fQ2lOxaR0" }
];

function formatDate(value) {
  if (!value) return "未設定";
  return new Date(`${value}T00:00:00`).toLocaleDateString("zh-TW");
}

function getRecord() {
  return JSON.parse(localStorage.getItem(storageKey) || "{}");
}

function normalizeLineId(value) {
  const text = String(value || "").trim();
  if (!text || legacyLineIds.has(text) || text.includes("7708LUNG")) return currentLineId;
  if (text.startsWith("https://line.me/R/ti/p/")) {
    return normalizeLineId(decodeURIComponent(text.split("/").pop() || ""));
  }
  return text.startsWith("@") ? text : `@${text}`;
}

function isLegacyCloudEndpoint(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (legacyCloudEndpoints.has(text)) return true;
  return [...legacyCloudDeploymentIds].some((deploymentId) => text.includes(deploymentId));
}

function isWarrantyCloudEndpoint(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return [...warrantyCloudDeploymentIds].some((deploymentId) => text.includes(deploymentId));
}

function normalizeAppsScriptEndpoint(value, fallbackEndpoint, fallbackDeploymentIds = new Set()) {
  const text = String(value || "").trim();
  if (!text || isLegacyCloudEndpoint(text)) return fallbackEndpoint;
  if ([...fallbackDeploymentIds].some((deploymentId) => text.includes(deploymentId))) return fallbackEndpoint;
  try {
    const url = new URL(text, location.href);
    if (url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.includes("/macros/s/")) {
      const normalized = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
      return isLegacyCloudEndpoint(normalized) ? fallbackEndpoint : normalized;
    }
  } catch {
    return text;
  }
  return text;
}

function normalizeCloudEndpoint(value) {
  return normalizeAppsScriptEndpoint(value, defaultCloudEndpoint, new Set([defaultCloudDeploymentId]));
}

function normalizeWarrantyEndpoint(value) {
  return normalizeAppsScriptEndpoint(value, defaultWarrantyEndpoint, warrantyCloudDeploymentIds);
}

function normalizeContentConfigUrl(value) {
  const text = String(value || "").trim();
  if (!text || text.includes("shen-yue.com.tw") || text.includes("script.google.com/macros/")) {
    return defaultContentConfigUrl;
  }
  return text;
}

function cleanWarrantyRecord(record = {}) {
  const clean = { ...record };
  delete clean.photos;
  delete clean.photo;
  delete clean.photoCount;

  if (clean.model && !warrantyModelSet.has(clean.model)) {
    delete clean.model;
  }

  if ("totalAmount" in clean) {
    clean.totalAmount = String(clean.totalAmount || "").replace(/[^\d.]/g, "").trim();
  }

  return clean;
}

function migrateLegacyData() {
  try {
    const savedAdmin = JSON.parse(localStorage.getItem(adminKey) || "{}");
    if (Object.keys(savedAdmin).length) {
      const savedCloudEndpoint = String(savedAdmin.cloudEndpoint || "");
      const nextAdmin = {
        ...savedAdmin,
        cloudEndpoint: normalizeCloudEndpoint(savedAdmin.cloudEndpoint),
        warrantyEndpoint: normalizeWarrantyEndpoint(savedAdmin.warrantyEndpoint),
        contentConfigUrl: normalizeContentConfigUrl(savedAdmin.contentConfigUrl),
        lineId: normalizeLineId(savedAdmin.lineId)
      };
      if (!savedAdmin.warrantyEndpoint && [...warrantyCloudDeploymentIds].some((deploymentId) => savedCloudEndpoint.includes(deploymentId))) {
        nextAdmin.warrantyEndpoint = normalizeWarrantyEndpoint(savedCloudEndpoint);
        nextAdmin.cloudEndpoint = defaultCloudEndpoint;
      }
      if (JSON.stringify(nextAdmin) !== JSON.stringify(savedAdmin)) {
        localStorage.setItem(adminKey, JSON.stringify(nextAdmin));
      }
    }
  } catch {
    localStorage.removeItem(adminKey);
  }

  const savedUpdateUrl = localStorage.getItem(updateUrlKey);
  if (isWarrantyCloudEndpoint(savedUpdateUrl)) {
    localStorage.setItem(updateUrlKey, getCloudUpdateManifestUrl());
  }

  try {
    const savedRecord = getRecord();
    const cleanRecord = cleanWarrantyRecord(savedRecord);
    if (JSON.stringify(cleanRecord) !== JSON.stringify(savedRecord)) {
      localStorage.setItem(storageKey, JSON.stringify(cleanRecord));
    }
  } catch {
    localStorage.removeItem(storageKey);
  }

  localStorage.removeItem("shenYueWarrantyPhotos");
  localStorage.removeItem("shenYueWarrantyPhotoCache");
  localStorage.removeItem("shenYueCarWarrantyPhotos");
}

function getAdminSettings() {
  const saved = JSON.parse(localStorage.getItem(adminKey) || "{}");
  const settings = {
    cloudEndpoint: defaultCloudEndpoint,
    warrantyEndpoint: defaultWarrantyEndpoint,
    contentConfigUrl: defaultContentConfigUrl,
    heroTitle: defaultContent.heroTitle,
    shopPhone: "0970-117-708",
    lineId: currentLineId,
    ...saved
  };
  settings.lineId = normalizeLineId(settings.lineId);
  settings.cloudEndpoint = normalizeCloudEndpoint(settings.cloudEndpoint);
  settings.warrantyEndpoint = normalizeWarrantyEndpoint(settings.warrantyEndpoint);
  settings.contentConfigUrl = normalizeContentConfigUrl(settings.contentConfigUrl);
  return settings;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function displayValue(value) {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : "未設定";
}

function getGithubReleaseDownloadUrl(fileName) {
  const cleanName = String(fileName || "").trim().split(/[\\/]/).filter(Boolean).pop() || "";
  if (!cleanName) return "";
  return `${defaultApkReleaseDownloadBase}${encodeURIComponent(cleanName)}`;
}

function looksLikeApkFilename(value) {
  const text = String(value || "").trim();
  if (!text || /^https?:\/\//i.test(text) || /^[a-z][a-z\d+.-]*:/i.test(text)) return false;
  return /\.apk$/i.test(text);
}

function normalizeApkDownloadUrl(value, apkFile = null) {
  const text = String(value || "").trim();
  const fileName = apkFile?.name || "";
  const pendingPrefix = "待上傳小 APK：";

  if (!text && fileName) return getGithubReleaseDownloadUrl(fileName);
  if (text.startsWith(pendingPrefix)) return getGithubReleaseDownloadUrl(text.slice(pendingPrefix.length) || fileName);
  if (text === defaultApkReleaseTagUrl || text === `${defaultApkReleaseTagUrl}/`) {
    return fileName ? getGithubReleaseDownloadUrl(fileName) : text;
  }
  if (looksLikeApkFilename(text)) return getGithubReleaseDownloadUrl(text);
  return text;
}

function isDirectDownloadUrl(value) {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return false;
  if (text === defaultApkReleaseTagUrl || text === `${defaultApkReleaseTagUrl}/`) return false;
  return true;
}

function formatAmount(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const number = Number(text.replaceAll(",", ""));
  if (!Number.isFinite(number)) return text;
  return `NT$ ${new Intl.NumberFormat("zh-TW").format(number)}`;
}

function copyFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("目前瀏覽器不允許自動複製");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  copyFallback(text);
}

async function sha256Hex(text) {
  if (window.crypto?.subtle && window.isSecureContext) {
    const bytes = new TextEncoder().encode(String(text || ""));
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;
  const value = String(text || "");
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return String(hash);
}

async function verifyAdminPin(value) {
  if (!window.crypto?.subtle || !window.isSecureContext) return String(value || "") === fallbackAdminPin;
  return await sha256Hex(value) === adminPinHash;
}

async function requestUpdateEditorAccess(actionLabel = "此操作") {
  if (updateEditorUnlocked) return true;
  const value = window.prompt(`${actionLabel}\n請輸入管理 PIN`);
  if (value === null) return false;
  const ok = await verifyAdminPin(value);
  if (ok) {
    updateEditorUnlocked = true;
    setUpdateUploadStatus("已通過管理 PIN，可新增或修改更新項目。", "success");
    if (updateStatus) updateStatus.textContent = "已通過管理 PIN，可開啟更新表格。";
    return true;
  }
  setUpdateUploadStatus("PIN 錯誤，無法新增或修改更新項目。", "error");
  if (updateStatus) updateStatus.textContent = "PIN 錯誤，更新表格未開啟。";
  return false;
}

function appendQueryParam(url, name, value) {
  const separator = String(url || "").includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

function getCloudUpdateManifestUrl() {
  const { cloudEndpoint } = getAdminSettings();
  return appendQueryParam(cloudEndpoint || defaultCloudEndpoint, "type", "updates");
}

function getPreferredUpdateManifestUrl() {
  const savedUrl = localStorage.getItem(updateUrlKey);
  if (
    savedUrl &&
    !isLegacyCloudEndpoint(savedUrl) &&
    !isWarrantyCloudEndpoint(savedUrl) &&
    savedUrl !== legacyUpdateManifestUrl &&
    savedUrl !== fallbackUpdateManifestUrl &&
    !savedUrl.includes("shen-yue-iphone-assistant")
  ) {
    return savedUrl;
  }
  const cloudManifestUrl = getCloudUpdateManifestUrl();
  localStorage.setItem(updateUrlKey, cloudManifestUrl);
  return cloudManifestUrl;
}

function resolveManifestRelativeUrl(value, fallback = "") {
  const url = String(value || "").trim();
  if (!url) return fallback;
  if (/^(https?:|file:|data:|blob:)/i.test(url)) return url;
  if (/^assets\//i.test(url)) {
    return new URL(url, location.href).href;
  }

  try {
    const manifestBase = new URL(currentUpdateManifestUrl || "updates.json", location.href);
    return new URL(url, manifestBase).href;
  } catch (error) {
    return url;
  }
}

function applyContent(content = {}) {
  const settings = getAdminSettings();
  const merged = {
    ...defaultContent,
    ...content,
    heroTitle: content.heroTitle || settings.heroTitle || defaultContent.heroTitle
  };

  document.querySelector('[data-content="heroTitle"]').textContent = merged.heroTitle;
  renderServices(merged.services || defaultContent.services);
}

function renderServices(services) {
  serviceGrid.innerHTML = services.map((service) => `
    <article>
      <div class="service-icon ${escapeHtml(service.iconClass)}"></div>
      <strong>${escapeHtml(service.number)}</strong>
      <h3>${escapeHtml(service.title)}</h3>
      <p>${escapeHtml(service.description)}</p>
    </article>
  `).join("");
}

async function loadRemoteContent(showMessage = false) {
  const { contentConfigUrl } = getAdminSettings();
  if (!contentConfigUrl) {
    applyContent();
    if (showMessage) adminOutput.textContent = "尚未設定遠端內容 JSON 網址，已使用 App 內建內容。";
    return;
  }

  try {
    const response = await fetch(`${contentConfigUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const content = await response.json();
    localStorage.setItem("shenYueRemoteContentCache", JSON.stringify(content));
    applyContent(content);
    if (showMessage) adminOutput.textContent = "已讀取遠端內容並更新畫面。";
  } catch (error) {
    const cached = localStorage.getItem("shenYueRemoteContentCache");
    if (cached) {
      applyContent(JSON.parse(cached));
      if (showMessage) adminOutput.textContent = `遠端讀取失敗，已使用上次快取內容：${error.message}`;
      return;
    }
    applyContent();
    if (showMessage) adminOutput.textContent = `遠端讀取失敗，已使用 App 內建內容：${error.message}`;
  }
}

function checkRemoteContentNow(options = {}) {
  const now = Date.now();
  const interval = isAndroidApk ? 120000 : 3000;
  if (!options.force && now - lastRemoteContentCheck < interval) return;
  lastRemoteContentCheck = now;
  loadRemoteContent();
}

function getPayload(type, data = {}) {
  return {
    type,
    app: "申悅助手",
    createdAt: new Date().toISOString(),
    ...data
  };
}

async function sendToCloud(payload) {
  const { cloudEndpoint, warrantyEndpoint } = getAdminSettings();
  const endpoint = payload?.type === "iphone-warranty" ? warrantyEndpoint : cloudEndpoint;
  if (!endpoint) throw new Error("尚未設定 Google Apps Script 雲端網址");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`雲端回應 HTTP ${response.status}`);

  const text = await response.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("雲端回應不是 JSON，請確認 Apps Script 已部署為新版網頁應用程式。");
  }
  if (result.ok === false) {
    throw new Error(result.message || "雲端回報上傳失敗。");
  }
  if (payload?.type === "update-center-app" && !result.item) {
    throw new Error("Apps Script 仍是舊版或未部署更新中心功能，沒有回傳更新項目。請在電腦執行 tools/deploy-apps-script.ps1 自動上傳並部署 Code.gs。");
  }
  if (payload?.type === "iphone-warranty" && !result.row) {
    throw new Error("Apps Script 尚未部署保固寫入試算表功能，沒有回傳 Google Sheet 列號。請重新部署 Code.gs。");
  }
  return result;
}

function setUpdateUploadStatus(message, tone = "") {
  if (!updateUploadStatus) return;
  updateUploadStatus.textContent = message;
  updateUploadStatus.dataset.tone = tone;
}

function showUpdateUploadCard(options = {}) {
  if (!updateUploadCard) return;
  updateUploadCard.hidden = false;
  if (options.message) setUpdateUploadStatus(options.message, options.tone || "");
  if (options.scroll) updateUploadCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideUpdateUploadCard() {
  if (!updateUploadCard) return;
  updateUploadCard.hidden = true;
  if (updateStatus) updateStatus.textContent = "更新表格已隱藏。";
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size >= 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function getUploadFileSignature(file) {
  if (!file) return "";
  return [file.name || "", file.size || 0, file.lastModified || 0].join(":");
}

function viewForBytes(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function decodeUtf8(bytes) {
  if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(bytes);
  let text = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return decodeURIComponent(escape(text));
}

function decodeUtf16Le(bytes) {
  if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-16le").decode(bytes);
  const view = viewForBytes(bytes);
  let text = "";
  for (let offset = 0; offset + 1 < bytes.length; offset += 2) {
    text += String.fromCharCode(view.getUint16(offset, true));
  }
  return text;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function bytesToDataUrl(bytes, mimeType = "application/octet-stream") {
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

function getImageMimeType(path = "") {
  const lower = String(path).toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function getFileExtension(path = "", fallback = "png") {
  const match = String(path).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : fallback;
}

function sha256BytesFallback(bytes) {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = viewForBytes(padded);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const words = new Uint32Array(64);
  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(chunk + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rightRotate(words[index - 15], 7) ^ rightRotate(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rightRotate(words[index - 2], 17) ^ rightRotate(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const choice = (e & f) ^ ((~e) & g);
      const temp1 = (h + s1 + choice + constants[index] + words[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return hash.map((value) => value.toString(16).padStart(8, "0")).join("");
}

function rightRotate(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}

async function sha256BytesHex(bytes) {
  if (window.crypto?.subtle) {
    try {
      const digest = await window.crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fall through to the local implementation when WebView blocks subtle crypto on file://.
    }
  }
  return sha256BytesFallback(bytes);
}

function parseZipEntries(bytes) {
  const view = viewForBytes(bytes);
  const maxSearch = Math.max(0, bytes.length - 0xffff - 22);
  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= maxSearch; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("找不到 APK ZIP 中央目錄。");

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries = [];
  const entryMap = new Map();
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = decodeUtf8(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const entry = { name, method, compressedSize, size, localHeaderOffset };
    entries.push(entry);
    entryMap.set(name, entry);
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return { bytes, entries, entryMap };
}

async function inflateZipBytes(compressedBytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("目前瀏覽器不支援 APK 解壓縮，請改用新版助手 APK 或桌機瀏覽器。");
  }

  const formats = ["deflate-raw", "deflate"];
  for (const format of formats) {
    try {
      const stream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      // Try the next compatible browser format.
    }
  }
  throw new Error("APK 內部壓縮資料解壓縮失敗。");
}

async function readZipEntryBytes(zip, entryName) {
  const entry = zip.entryMap.get(entryName);
  if (!entry) return null;
  const view = viewForBytes(zip.bytes);
  const offset = entry.localHeaderOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) throw new Error(`APK 項目格式錯誤：${entryName}`);
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataOffset = offset + 30 + nameLength + extraLength;
  const compressedBytes = zip.bytes.subarray(dataOffset, dataOffset + entry.compressedSize);
  if (entry.method === 0) return compressedBytes;
  if (entry.method === 8) return inflateZipBytes(compressedBytes);
  throw new Error(`APK 項目使用不支援的壓縮方式：${entry.method}`);
}

function readUtf8Length(bytes, offset) {
  const first = bytes[offset];
  if ((first & 0x80) === 0) return { value: first, next: offset + 1 };
  return { value: ((first & 0x7f) << 8) | bytes[offset + 1], next: offset + 2 };
}

function readUtf16Length(view, offset) {
  const first = view.getUint16(offset, true);
  if ((first & 0x8000) === 0) return { value: first, next: offset + 2 };
  return { value: ((first & 0x7fff) << 16) | view.getUint16(offset + 2, true), next: offset + 4 };
}

function parseAndroidStringPool(bytes, offset = 0) {
  const view = viewForBytes(bytes);
  if (view.getUint16(offset, true) !== 0x0001) throw new Error("Android 字串表格式錯誤。");
  const stringCount = view.getUint32(offset + 8, true);
  const flags = view.getUint32(offset + 16, true);
  const stringsStart = view.getUint32(offset + 20, true);
  const isUtf8 = (flags & 0x00000100) !== 0;
  const strings = [];

  for (let index = 0; index < stringCount; index += 1) {
    const stringOffset = offset + stringsStart + view.getUint32(offset + 28 + index * 4, true);
    if (isUtf8) {
      const utf16Length = readUtf8Length(bytes, stringOffset);
      const utf8Length = readUtf8Length(bytes, utf16Length.next);
      strings.push(decodeUtf8(bytes.subarray(utf8Length.next, utf8Length.next + utf8Length.value)));
    } else {
      const length = readUtf16Length(view, stringOffset);
      strings.push(decodeUtf16Le(bytes.subarray(length.next, length.next + length.value * 2)));
    }
  }

  return {
    strings,
    size: view.getUint32(offset + 4, true)
  };
}

function decodeAndroidTypedValue(dataType, data, strings) {
  switch (dataType) {
    case 0x01:
      return `@0x${(data >>> 0).toString(16).padStart(8, "0")}`;
    case 0x03:
      return strings[data] || "";
    case 0x10:
      return String(data | 0);
    case 0x11:
      return `0x${(data >>> 0).toString(16)}`;
    case 0x12:
      return data ? "true" : "false";
    default:
      return data ? String(data) : "";
  }
}

function parseAndroidBinaryXml(bytes) {
  const view = viewForBytes(bytes);
  if (view.getUint16(0, true) !== 0x0003) throw new Error("AndroidManifest.xml 不是 APK 二進位 XML。");
  const fileSize = view.getUint32(4, true);
  const elements = [];
  let strings = [];
  let offset = view.getUint16(2, true);

  while (offset + 8 <= Math.min(fileSize, bytes.length)) {
    const chunkType = view.getUint16(offset, true);
    const headerSize = view.getUint16(offset + 2, true);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkSize <= 0) break;

    if (chunkType === 0x0001) {
      strings = parseAndroidStringPool(bytes, offset).strings;
    } else if (chunkType === 0x0102) {
      const nameIndex = view.getUint32(offset + 20, true);
      const attributeStart = view.getUint16(offset + 24, true);
      const attributeSize = view.getUint16(offset + 26, true);
      const attributeCount = view.getUint16(offset + 28, true);
      const attributes = {};

      for (let index = 0; index < attributeCount; index += 1) {
        const attrOffset = offset + 16 + attributeStart + index * attributeSize;
        const namespaceIndex = view.getUint32(attrOffset, true);
        const attrNameIndex = view.getUint32(attrOffset + 4, true);
        const rawValueIndex = view.getUint32(attrOffset + 8, true);
        const dataType = view.getUint8(attrOffset + 15);
        const data = view.getUint32(attrOffset + 16, true);
        const attrName = strings[attrNameIndex] || "";
        const rawValue = rawValueIndex === 0xffffffff ? "" : (strings[rawValueIndex] || "");
        const value = rawValue || decodeAndroidTypedValue(dataType, data, strings);
        attributes[attrName] = {
          name: attrName,
          namespace: namespaceIndex === 0xffffffff ? "" : (strings[namespaceIndex] || ""),
          rawValue,
          value,
          dataType,
          data
        };
      }

      elements.push({
        name: strings[nameIndex] || "",
        attributes
      });
    }

    offset += chunkSize || headerSize || 8;
  }

  return elements;
}

function parseAndroidResourceTable(bytes) {
  const view = viewForBytes(bytes);
  if (view.getUint16(0, true) !== 0x0002) return null;
  const tableSize = view.getUint32(4, true);
  let offset = view.getUint16(2, true);
  let globalStrings = [];
  const resources = new Map();

  while (offset + 8 <= Math.min(tableSize, bytes.length)) {
    const type = view.getUint16(offset, true);
    const size = view.getUint32(offset + 4, true);
    if (size <= 0) break;

    if (type === 0x0001 && !globalStrings.length) {
      globalStrings = parseAndroidStringPool(bytes, offset).strings;
    } else if (type === 0x0200) {
      parseAndroidResourcePackage(bytes, offset, size, globalStrings, resources);
    }

    offset += size;
  }

  return resources;
}

function parseAndroidResourcePackage(bytes, packageOffset, packageSize, globalStrings, resources) {
  const view = viewForBytes(bytes);
  const packageId = view.getUint32(packageOffset + 8, true) & 0xff;
  const headerSize = view.getUint16(packageOffset + 2, true);
  const typeStringsOffset = view.getUint32(packageOffset + 268, true);
  const keyStringsOffset = view.getUint32(packageOffset + 276, true);
  const typeStrings = typeStringsOffset ? parseAndroidStringPool(bytes, packageOffset + typeStringsOffset).strings : [];
  const keyStrings = keyStringsOffset ? parseAndroidStringPool(bytes, packageOffset + keyStringsOffset).strings : [];
  let offset = packageOffset + headerSize;
  const end = packageOffset + packageSize;

  while (offset + 8 <= end) {
    const chunkType = view.getUint16(offset, true);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkSize <= 0) break;

    if (chunkType === 0x0201) {
      const typeId = view.getUint8(offset + 8);
      const entryCount = view.getUint32(offset + 12, true);
      const entriesStart = view.getUint32(offset + 16, true);
      const offsetsStart = offset + view.getUint16(offset + 2, true);
      const typeName = typeStrings[typeId - 1] || "";

      for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
        const entryRelativeOffset = view.getUint32(offsetsStart + entryIndex * 4, true);
        if (entryRelativeOffset === 0xffffffff) continue;
        const entryOffset = offset + entriesStart + entryRelativeOffset;
        const entrySize = view.getUint16(entryOffset, true);
        const flags = view.getUint16(entryOffset + 2, true);
        const keyIndex = view.getUint32(entryOffset + 4, true);
        if ((flags & 0x0001) !== 0) continue;
        const valueOffset = entryOffset + entrySize;
        const dataType = view.getUint8(valueOffset + 3);
        const data = view.getUint32(valueOffset + 4, true);
        const value = decodeAndroidTypedValue(dataType, data, globalStrings);
        const resourceId = (((packageId << 24) | (typeId << 16) | entryIndex) >>> 0);
        const current = resources.get(resourceId) || {
          id: resourceId,
          typeName,
          keyName: keyStrings[keyIndex] || "",
          values: []
        };
        current.values.push({ dataType, data, value });
        resources.set(resourceId, current);
      }
    }

    offset += chunkSize;
  }
}

function getAndroidXmlAttr(element, attrName) {
  return element?.attributes?.[attrName] || null;
}

function getAndroidXmlAttrValue(element, attrName) {
  return getAndroidXmlAttr(element, attrName)?.value || "";
}

function getResourceIdFromAttribute(attribute) {
  if (!attribute) return 0;
  if (attribute.dataType === 0x01) return attribute.data >>> 0;
  const text = String(attribute.rawValue || attribute.value || "");
  const hexMatch = text.match(/^@0x([0-9a-f]+)$/i);
  if (hexMatch) return Number.parseInt(hexMatch[1], 16) >>> 0;
  const decimalMatch = text.match(/^@(\d+)$/);
  return decimalMatch ? (Number.parseInt(decimalMatch[1], 10) >>> 0) : 0;
}

function getResourceValues(resourceTable, resourceId) {
  if (!resourceTable || !resourceId) return [];
  return resourceTable.get(resourceId)?.values || [];
}

function resolveResourceString(resourceTable, attribute) {
  const rawText = String(attribute?.rawValue || attribute?.value || "").trim();
  if (rawText && !rawText.startsWith("@")) return rawText;
  const values = getResourceValues(resourceTable, getResourceIdFromAttribute(attribute));
  const resolved = values
    .map((item) => String(item.value || "").trim())
    .find((value) => value && !value.startsWith("res/") && !value.startsWith("@"));
  return resolved || "";
}

function getResourceIconPaths(resourceTable, resourceId) {
  return getResourceValues(resourceTable, resourceId)
    .map((item) => String(item.value || "").trim())
    .filter((value) => /^res\/.+\.(png|webp|jpg|jpeg)$/i.test(value));
}

function normalizeAndroidInteger(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^0x[0-9a-f]+$/i.test(text)) return String(Number.parseInt(text.slice(2), 16));
  return text;
}

function getResourceNameIconPaths(zip, attribute, resourceTable) {
  const paths = [];
  const rawText = String(attribute?.rawValue || attribute?.value || "").trim();
  const nameMatch = rawText.match(/^@([a-z0-9_]+)\/([a-z0-9_.-]+)$/i);
  if (nameMatch) {
    const [, typeName, keyName] = nameMatch;
    const pattern = new RegExp(`^res/${typeName}[^/]*/${escapeRegExp(keyName)}\\.(png|webp|jpg|jpeg)$`, "i");
    paths.push(...zip.entries.map((entry) => entry.name).filter((name) => pattern.test(name)));
  }

  const resource = resourceTable?.get(getResourceIdFromAttribute(attribute));
  if (resource?.keyName) {
    const pattern = new RegExp(`^res/(mipmap|drawable)[^/]*/${escapeRegExp(resource.keyName)}\\.(png|webp|jpg|jpeg)$`, "i");
    paths.push(...zip.entries.map((entry) => entry.name).filter((name) => pattern.test(name)));
  }
  return [...new Set(paths)];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreIconPath(path, entry, explicit) {
  const lower = path.toLowerCase();
  let score = explicit ? 200 : 0;
  if (lower.includes("/mipmap")) score += 30;
  if (lower.includes("ic_launcher")) score += 90;
  if (lower.includes("app_icon")) score += 80;
  if (lower.includes("icon")) score += 65;
  if (lower.includes("logo")) score += 45;
  if (lower.includes("xxxhdpi")) score += 36;
  if (lower.includes("xxhdpi")) score += 30;
  if (lower.includes("xhdpi")) score += 24;
  if (lower.includes("hdpi")) score += 18;
  if (lower.includes("mdpi")) score += 12;
  if (/\.(webp|png)$/i.test(lower)) score += 20;
  if (/background|splash|banner|wide|notification/i.test(lower)) score -= 100;
  score += Math.min(50, Math.round((entry?.size || 0) / 4096));
  return score;
}

function chooseBestIconEntry(zip, explicitPaths = []) {
  const explicitSet = new Set(explicitPaths);
  const candidates = (explicitPaths.length ? explicitPaths : zip.entries.map((entry) => entry.name))
    .map((name) => zip.entryMap.get(name))
    .filter((entry) => entry && /^res\/(mipmap|drawable)[^/]*\/.+\.(png|webp|jpg|jpeg)$/i.test(entry.name));

  if (!candidates.length && explicitPaths.length) return chooseBestIconEntry(zip, []);
  return candidates
    .map((entry) => ({
      entry,
      score: scoreIconPath(entry.name, entry, explicitSet.has(entry.name))
    }))
    .sort((left, right) => right.score - left.score)[0]?.entry || null;
}

async function extractApkIconFile(zip, metadata, resourceTable) {
  const iconAttribute = metadata.iconAttribute || metadata.roundIconAttribute;
  const explicitPaths = [
    ...getResourceIconPaths(resourceTable, getResourceIdFromAttribute(iconAttribute)),
    ...getResourceNameIconPaths(zip, iconAttribute, resourceTable)
  ];
  const entry = chooseBestIconEntry(zip, [...new Set(explicitPaths)]);
  if (!entry) return null;
  const iconBytes = await readZipEntryBytes(zip, entry.name);
  if (!iconBytes?.length) return null;
  const extension = getFileExtension(entry.name, "png");
  const mimeType = getImageMimeType(entry.name);
  const baseName = normalizeUpdateItemId(metadata.packageName || metadata.appName || "apk-icon");
  return {
    name: `${baseName}-icon.${extension}`,
    type: mimeType,
    size: iconBytes.length,
    sizeLabel: formatFileSize(iconBytes.length),
    dataUrl: bytesToDataUrl(iconBytes, mimeType),
    sourcePath: entry.name
  };
}

function sdkToAndroidLabel(sdkValue) {
  const sdk = Number(sdkValue || 0);
  const labels = {
    21: "Android 5.0", 22: "Android 5.1", 23: "Android 6.0", 24: "Android 7.0",
    25: "Android 7.1", 26: "Android 8.0", 27: "Android 8.1", 28: "Android 9",
    29: "Android 10", 30: "Android 11", 31: "Android 12", 32: "Android 12L",
    33: "Android 13", 34: "Android 14", 35: "Android 15", 36: "Android 16"
  };
  if (!sdk) return "";
  return labels[sdk] ? `${labels[sdk]} (SDK ${sdk})` : `SDK ${sdk}`;
}

function inferUpdateCategory(info = {}) {
  const text = `${info.packageName || ""} ${info.appName || ""}`.toLowerCase();
  if (/youtube|netflix|disney|video|tv|player|kodi|music|spotify|影音|影視|播放/.test(text)) return "影音播放";
  if (/map|nav|gps|waze|kingway|speed|camera|導航|地圖|測速/.test(text)) return "導航地圖";
  if (/keyboard|inputmethod|zhuyin|gboard|ime|輸入/.test(text)) return "輸入法";
  if (/car|auto|vehicle|obd|dashcam|recorder|車機|行車/.test(text)) return "車機輔助";
  if (/tool|manager|file|browser|settings|system|gms|microg|service/.test(text)) return "系統工具";
  return "其他應用";
}

function buildAutoUpdateDescription(info = {}) {
  const name = info.appName || "此 App";
  const version = info.versionName ? `版本 ${info.versionName}` : (info.versionCode ? `版本碼 ${info.versionCode}` : "版本資訊已讀取");
  return `${name} APK，${version}，已自動讀取套件名稱、容量、SDK 與 SHA-256，可在車機更新中心下載安裝。`;
}

function extractUpdateApkMetadataFromManifest(elements, resourceTable, file) {
  const manifest = elements.find((item) => item.name === "manifest") || {};
  const usesSdk = elements.find((item) => item.name === "uses-sdk") || {};
  const application = elements.find((item) => item.name === "application") || {};
  const labelAttribute = getAndroidXmlAttr(application, "label");
  const iconAttribute = getAndroidXmlAttr(application, "icon");
  const roundIconAttribute = getAndroidXmlAttr(application, "roundIcon");
  const minSdk = normalizeAndroidInteger(getAndroidXmlAttrValue(usesSdk, "minSdkVersion"));
  const targetSdk = normalizeAndroidInteger(getAndroidXmlAttrValue(usesSdk, "targetSdkVersion"));
  const appName = resolveResourceString(resourceTable, labelAttribute)
    || String(file?.name || "").replace(/\.apk$/i, "");

  return {
    packageName: getAndroidXmlAttrValue(manifest, "package"),
    versionName: getAndroidXmlAttrValue(manifest, "versionName"),
    versionCode: normalizeAndroidInteger(getAndroidXmlAttrValue(manifest, "versionCode")),
    minSdk,
    minAndroid: sdkToAndroidLabel(minSdk),
    targetSdk,
    appName,
    iconAttribute,
    roundIconAttribute
  };
}

function readNativeApkMetadata(file) {
  const inspector = window.ShenYueUpdater?.inspectLastSelectedApk;
  if (typeof inspector !== "function") return null;
  try {
    const result = parseNativeResult(inspector.call(window.ShenYueUpdater, file?.name || ""));
    return result?.ok ? result : null;
  } catch {
    return null;
  }
}

async function readApkMetadata(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha256 = await sha256BytesHex(bytes);
  const nativeInfo = readNativeApkMetadata(file);
  if (nativeInfo?.packageName && nativeInfo?.versionCode) {
    return {
      metadata: {
        ...nativeInfo,
        sha256,
        sizeLabel: formatFileSize(file.size),
        minAndroid: nativeInfo.minAndroid || sdkToAndroidLabel(nativeInfo.minSdk)
      },
      iconFile: nativeInfo.iconDataUrl ? {
        name: `${normalizeUpdateItemId(nativeInfo.packageName || nativeInfo.appName || file.name)}-icon.png`,
        type: "image/png",
        size: 0,
        sizeLabel: "",
        dataUrl: nativeInfo.iconDataUrl
      } : null
    };
  }

  const zip = parseZipEntries(bytes);
  const manifestBytes = await readZipEntryBytes(zip, "AndroidManifest.xml");
  if (!manifestBytes) throw new Error("APK 裡找不到 AndroidManifest.xml。");
  const elements = parseAndroidBinaryXml(manifestBytes);
  const resourcesBytes = await readZipEntryBytes(zip, "resources.arsc").catch(() => null);
  const resourceTable = resourcesBytes ? parseAndroidResourceTable(resourcesBytes) : null;
  const metadata = extractUpdateApkMetadataFromManifest(elements, resourceTable, file);
  metadata.sha256 = sha256;
  metadata.sizeLabel = formatFileSize(file.size);
  const iconFile = await extractApkIconFile(zip, metadata, resourceTable).catch(() => null);
  return { metadata, iconFile };
}

function setAutoDetectedFormValue(name, value, overwrite = true) {
  const field = updateUploadForm?.elements[name];
  if (!field || value === undefined || value === null || value === "") return;
  if (!overwrite && hasText(field.value)) return;
  if (field.tagName === "SELECT" && ![...field.options].some((option) => option.value === String(value))) {
    field.add(new Option(String(value), String(value)));
  }
  field.value = String(value);
}

function clearExtractedApkIconPreview() {
  const preview = updateUploadForm?.querySelector('[data-upload-preview="apkIcon"]');
  if (preview) {
    preview.hidden = true;
    preview.replaceChildren();
  }
  const iconField = updateUploadForm?.elements.iconUrl;
  if (iconField?.dataset.pendingUpload === "apkIcon") clearPendingUploadField(iconField, true);
}

function renderExtractedApkIconPreview(iconFile) {
  const fieldWrap = updateUploadForm?.elements.iconUrl?.closest(".update-upload-field");
  if (!fieldWrap || !iconFile?.dataUrl) return;
  let preview = fieldWrap.querySelector('[data-upload-preview="apkIcon"]');
  if (!preview) {
    preview = document.createElement("div");
    preview.className = "upload-preview";
    preview.dataset.uploadPreview = "apkIcon";
    fieldWrap.append(preview);
  }
  preview.replaceChildren();

  const image = document.createElement("img");
  image.src = iconFile.dataUrl;
  image.alt = "APK 自動擷取圖標預覽";
  preview.append(image);

  const text = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("span");
  title.textContent = "已從 APK 自動擷取圖標";
  detail.textContent = iconFile.sourcePath || iconFile.name || "APK icon";
  text.append(title, detail);
  preview.append(text);
  preview.hidden = false;
}

function setExtractedApkIconField(iconFile) {
  const iconField = updateUploadForm?.elements.iconUrl;
  const manualIconFile = updateUploadForm?.elements.iconFile?.files?.[0];
  if (!iconField || manualIconFile) return;
  if (!iconFile?.dataUrl) {
    clearExtractedApkIconPreview();
    return;
  }
  if (iconField.dataset.pendingUpload !== "apkIcon") {
    iconField.dataset.previousUploadValue = iconField.value || "";
  }
  iconField.dataset.pendingUpload = "apkIcon";
  iconField.classList.add("has-pending-upload");
  iconField.value = `已從 APK 自動擷取圖標：${iconFile.name || "icon.png"}`;
  renderExtractedApkIconPreview(iconFile);
}

function applyUpdateUploadApkInfo(parsed, file) {
  if (!updateUploadForm || !parsed?.metadata) return;
  const metadata = parsed.metadata;
  const appName = metadata.appName || String(file?.name || "").replace(/\.apk$/i, "");
  const inferred = { ...metadata, appName };
  setAutoDetectedFormValue("appName", appName);
  setAutoDetectedFormValue("sizeLabel", metadata.sizeLabel || formatFileSize(file?.size));
  setAutoDetectedFormValue("packageName", metadata.packageName);
  setAutoDetectedFormValue("versionName", metadata.versionName);
  setAutoDetectedFormValue("versionCode", metadata.versionCode);
  setAutoDetectedFormValue("minAndroid", metadata.minAndroid || sdkToAndroidLabel(metadata.minSdk));
  setAutoDetectedFormValue("targetSdk", metadata.targetSdk);
  setAutoDetectedFormValue("sha256", metadata.sha256);
  setAutoDetectedFormValue("category", inferUpdateCategory(inferred), false);
  setAutoDetectedFormValue("description", buildAutoUpdateDescription(inferred), false);
  setExtractedApkIconField(parsed.iconFile);

  const extra = updateUploadForm.querySelector(".update-upload-extra");
  if (extra && (metadata.minAndroid || metadata.minSdk || metadata.targetSdk || metadata.sha256)) {
    extra.open = true;
  }
}

async function inspectUpdateUploadApk(file, options = {}) {
  if (!file) return null;
  const signature = getUploadFileSignature(file);
  if (!options.force && lastParsedUploadApk?.signature === signature && lastParsedUploadApk.ok) {
    return lastParsedUploadApk;
  }

  const requestId = ++updateUploadApkInspectionId;
  if (!options.silent) setUpdateUploadStatus("正在自動讀取 APK 資訊...", "working");

  try {
    const parsed = await readApkMetadata(file);
    if (requestId !== updateUploadApkInspectionId) return null;
    lastParsedUploadApk = { ok: true, signature, ...parsed };
    applyUpdateUploadApkInfo(lastParsedUploadApk, file);
    const fields = [
      parsed.metadata.packageName ? "套件名稱" : "",
      parsed.metadata.versionCode ? "版本碼" : "",
      parsed.metadata.versionName ? "版本名稱" : "",
      parsed.metadata.sha256 ? "SHA-256" : "",
      parsed.iconFile ? "圖標" : ""
    ].filter(Boolean).join("、");
    setUpdateUploadStatus(`APK 已自動讀取：${fields || "基本資料"}。只需要再選第一張圖片與第二張圖片即可。`, "success");
    return lastParsedUploadApk;
  } catch (error) {
    if (requestId !== updateUploadApkInspectionId) return null;
    lastParsedUploadApk = { ok: false, signature, error };
    setUpdateUploadStatus(`APK 自動讀取失敗：${error.message || error}。仍可手動填寫必要欄位後上傳。`, "error");
    return lastParsedUploadApk;
  }
}

async function ensureUpdateUploadApkInspection(file) {
  if (!file) return null;
  const signature = getUploadFileSignature(file);
  if (lastParsedUploadApk?.signature === signature) return lastParsedUploadApk;
  return inspectUpdateUploadApk(file, { silent: true });
}

function getInlineUploadLimit(kind) {
  return kind === "apk" ? maxInlineApkUploadBytes : maxInlineImageUploadBytes;
}

function assertInlineUploadSize(file, kind) {
  if (!file || !file.name) return;
  const limit = getInlineUploadLimit(kind);
  if (Number(file.size || 0) <= limit) return;

  const limitLabel = formatFileSize(limit);
  const fileLabel = formatFileSize(file.size);
  if (kind === "apk") {
    throw new Error(`APK 檔案 ${fileLabel} 太大，請先上傳到 GitHub Releases、Google Drive 或其他免費空間，再把直接下載網址貼到「應用下載地址」。目前表格只讀取 APK 資訊，不會保存檔案。`);
  }
  throw new Error(`圖片檔案 ${fileLabel} 太大，請壓縮圖片或改貼圖片網址。本表格只直接上傳 ${limitLabel} 以下的圖片。`);
}

function readUploadFile(file, kind = "image") {
  if (!file || !file.name) return Promise.resolve(null);
  assertInlineUploadSize(file, kind);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        sizeLabel: formatFileSize(file.size),
        dataUrl: String(reader.result || "")
      });
    });
    reader.addEventListener("error", () => reject(new Error(`讀取檔案失敗：${file.name}`)));
    reader.readAsDataURL(file);
  });
}

function getUpdateUploadFileTarget(input) {
  return updateUploadFileTargets[input?.name] || null;
}

function clearPendingUploadField(field, restorePrevious = false) {
  if (!field) return;
  if (restorePrevious && Object.prototype.hasOwnProperty.call(field.dataset, "previousUploadValue")) {
    field.value = field.dataset.previousUploadValue || "";
  }
  field.classList.remove("has-pending-upload");
  delete field.dataset.pendingUpload;
  delete field.dataset.previousUploadValue;
}

function clearAllPendingUploadFields(restorePrevious = false) {
  if (!updateUploadForm) return;
  updateUploadForm.querySelectorAll(".has-pending-upload").forEach((field) => {
    clearPendingUploadField(field, restorePrevious);
  });
}

function setPendingUploadFieldState(input, file) {
  const target = getUpdateUploadFileTarget(input);
  if (!target?.fieldName || !updateUploadForm) return;
  const field = updateUploadForm.elements[target.fieldName];
  if (!field) return;

  if (!file) {
    if (field.dataset.pendingUpload === input.name) clearPendingUploadField(field, true);
    return;
  }

  if (target.kind === "apk" && hasText(field.value) && !field.classList.contains("has-pending-upload")) {
    return;
  }

  if (field.dataset.pendingUpload !== input.name) {
    field.dataset.previousUploadValue = field.value || "";
  }
  field.dataset.pendingUpload = input.name;
  field.classList.add("has-pending-upload");
  field.value = target.kind === "apk"
    ? `待上傳小 APK：${file.name}`
    : `待上傳置換：${file.name}`;
}

function clearUploadPreviewObjectUrl(preview) {
  if (!preview?.dataset.objectUrl || typeof URL === "undefined") return;
  URL.revokeObjectURL(preview.dataset.objectUrl);
  delete preview.dataset.objectUrl;
}

function renderPendingUploadPreview(input, file) {
  const target = getUpdateUploadFileTarget(input);
  const fieldWrap = input?.closest(".update-upload-field");
  if (!target || !fieldWrap) return;

  let preview = fieldWrap.querySelector(`[data-upload-preview="${input.name}"]`);
  if (!file) {
    if (preview) {
      clearUploadPreviewObjectUrl(preview);
      preview.hidden = true;
      preview.replaceChildren();
    }
    return;
  }

  if (!preview) {
    preview = document.createElement("div");
    preview.className = "upload-preview";
    preview.dataset.uploadPreview = input.name;
    fieldWrap.append(preview);
  }

  clearUploadPreviewObjectUrl(preview);
  preview.replaceChildren();

  if (target.kind === "image" && file.type?.startsWith("image/") && typeof URL !== "undefined") {
    const image = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;
    image.alt = `${target.label}預覽`;
    preview.dataset.objectUrl = objectUrl;
    preview.append(image);
  }

  const text = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("span");
  title.textContent = target.kind === "apk" ? file.name : `待置換：${file.name}`;
  detail.textContent = `${target.label} · ${formatFileSize(file.size)}`;
  text.append(title, detail);
  preview.append(text);
  preview.hidden = false;
}

function removePendingUploadDisplayValues(data = {}) {
  if (!updateUploadForm) return data;
  Object.keys(data).forEach((key) => {
    const field = updateUploadForm.elements[key];
    if (field?.classList?.contains("has-pending-upload")) {
      data[key] = "";
    }
  });
  Object.entries(updateUploadFileTargets).forEach(([inputName, target]) => {
    const file = updateUploadForm.elements[inputName]?.files?.[0];
    if (!file || !target.fieldName) return;
    if (target.kind === "image" || String(data[target.fieldName] || "").startsWith("待上傳")) {
      data[target.fieldName] = "";
    }
  });
  return data;
}

function buildCloudUpdateUploadData(data = {}, files = {}) {
  const cloudData = { ...data };
  return cloudData;
}

function getUpdateUploadData() {
  const data = {};
  const formData = new FormData(updateUploadForm);
  formData.forEach((value, key) => {
    if (typeof File !== "undefined" && value instanceof File) return;
    data[key] = String(value ?? "").trim();
  });
  return removePendingUploadDisplayValues(data);
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
  return `shen-yue-app-${Math.abs(hash).toString(36)}`;
}

function getFallbackUpdateName(data = {}) {
  const rawUrl = String(data.apkUrl || "").trim();
  if (!rawUrl) return "未命名 APK";

  try {
    const parsed = new URL(rawUrl, location.href);
    const lastSegment = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    return lastSegment.replace(/\.apk$/i, "") || "未命名 APK";
  } catch {
    const lastSegment = rawUrl.split(/[/?#]/).filter(Boolean).pop() || "";
    return lastSegment.replace(/\.apk$/i, "") || "未命名 APK";
  }
}

function buildUpdateManifestItem(data = {}, files = {}) {
  const galleryImages = [
    files.firstImage?.dataUrl || data.firstImageUrl || "",
    files.secondImage?.dataUrl || data.secondImageUrl || ""
  ].filter(Boolean);
  const versionCode = Number(data.versionCode || 0);

  return {
    id: data.manifestId || normalizeUpdateItemId(data.packageName || data.appName || data.apkUrl),
    name: data.appName || getFallbackUpdateName(data),
    category: data.category || "其他應用",
    packageName: data.packageName || "",
    versionCode: Number.isFinite(versionCode) ? versionCode : 0,
    versionName: data.versionName || "未標示",
    minAndroid: data.minAndroid || "依 APK 設定",
    targetSdk: data.targetSdk || "",
    sizeLabel: data.sizeLabel || files.apk?.sizeLabel || "",
    apkUrl: data.apkUrl || "",
    sha256: data.sha256 || "",
    imageUrl: galleryImages[0] || "assets/update-splash.png",
    iconUrl: files.icon?.dataUrl || data.iconUrl || "assets/app-logo.png",
    galleryImages,
    description: data.description || "此 APK 尚未填寫介紹。",
    changelog: [
      "已由更新中心表格新增",
      data.category ? `分類：${data.category}` : "",
      "可在車機內下載安裝"
    ].filter(Boolean)
  };
}

function getExistingUploadItem(data = {}) {
  const manifestId = String(data.manifestId || "").trim();
  if (!manifestId) return null;
  return currentUpdateItems.find((item) => item.id === manifestId) || null;
}

function getUpdateItemKey(item = {}) {
  return String(item.id || item.packageName || normalizeUpdateItemId(item.name || item.apkUrl || "shen-yue-app")).trim();
}

function isInlineUploadUrl(value) {
  return /^(data:|blob:)/i.test(String(value || ""));
}

function getStorageSafeUpdateItem(item = {}) {
  const key = getUpdateItemKey(item);
  const existingItem = currentUpdateItems.find((existing) => getUpdateItemKey(existing) === key) || {};
  const existingGalleryImages = Array.isArray(existingItem.galleryImages) ? existingItem.galleryImages : [];
  const galleryImages = (Array.isArray(item.galleryImages) ? item.galleryImages : [])
    .map((url, index) => isInlineUploadUrl(url) ? (existingGalleryImages[index] || "") : url)
    .filter(Boolean);
  const imageUrl = isInlineUploadUrl(item.imageUrl)
    ? (galleryImages[0] || existingItem.imageUrl || "assets/update-splash.png")
    : item.imageUrl;
  const iconUrl = isInlineUploadUrl(item.iconUrl)
    ? (existingItem.iconUrl || "assets/app-logo.png")
    : item.iconUrl;

  return {
    ...item,
    imageUrl,
    iconUrl,
    galleryImages
  };
}

function rememberLastUpdateUpload(updateApp, manifestItem) {
  try {
    localStorage.setItem(updateUploadKey, JSON.stringify({
      createdAt: new Date().toISOString(),
      updateApp,
      manifestItem: getStorageSafeUpdateItem(manifestItem)
    }));
    return true;
  } catch {
    localStorage.removeItem(updateUploadKey);
    return false;
  }
}

function getLocalUpdateOverrides() {
  try {
    const items = JSON.parse(localStorage.getItem(localUpdateOverridesKey) || "[]");
    return Array.isArray(items) ? items.filter(Boolean) : [];
  } catch {
    localStorage.removeItem(localUpdateOverridesKey);
    return [];
  }
}

function mergeUpdateOverrides(items = []) {
  const overrides = getLocalUpdateOverrides();
  if (!overrides.length) return items;

  const result = [];
  const seen = new Set();
  overrides.concat(items).forEach((item) => {
    if (!item) return;
    const key = getUpdateItemKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

function saveLocalUpdateOverride(item) {
  if (!item) return;
  const storageItem = getStorageSafeUpdateItem(item);
  const key = getUpdateItemKey(storageItem);
  const nextItems = [
    storageItem,
    ...getLocalUpdateOverrides()
      .map((existing) => getStorageSafeUpdateItem(existing))
      .filter((existing) => getUpdateItemKey(existing) !== key)
  ];
  try {
    localStorage.setItem(localUpdateOverridesKey, JSON.stringify(nextItems));
  } catch {
    localStorage.removeItem(localUpdateOverridesKey);
    try {
      localStorage.setItem(localUpdateOverridesKey, JSON.stringify([storageItem]));
    } catch {
      // Local preview persistence is optional; cloud upload must keep going.
    }
  }
}

function removeLocalUpdateOverride(item) {
  if (!item) return;
  const key = getUpdateItemKey(item);
  const nextItems = getLocalUpdateOverrides()
    .map((existing) => getStorageSafeUpdateItem(existing))
    .filter((existing) => getUpdateItemKey(existing) !== key);
  if (!nextItems.length) {
    localStorage.removeItem(localUpdateOverridesKey);
    return;
  }
  try {
    localStorage.setItem(localUpdateOverridesKey, JSON.stringify(nextItems));
  } catch {
    localStorage.removeItem(localUpdateOverridesKey);
  }
}

function mergeExistingUploadData(data = {}, existingItem = null) {
  if (!existingItem) return { ...data };
  const galleryImages = Array.isArray(existingItem.galleryImages) ? existingItem.galleryImages : [];
  return {
    manifestId: data.manifestId || existingItem.id || "",
    iconUrl: data.iconUrl || existingItem.iconUrl || "",
    appName: data.appName || existingItem.name || "",
    category: data.category || existingItem.category || "",
    description: data.description || existingItem.description || existingItem.introduction || existingItem.note || "",
    firstImageUrl: data.firstImageUrl || galleryImages[0] || existingItem.imageUrl || "",
    secondImageUrl: data.secondImageUrl || galleryImages[1] || "",
    apkUrl: data.apkUrl || existingItem.apkUrl || "",
    sizeLabel: data.sizeLabel || existingItem.sizeLabel || existingItem.size || "",
    packageName: data.packageName || existingItem.packageName || "",
    versionName: data.versionName || existingItem.versionName || "",
    versionCode: data.versionCode || existingItem.versionCode || "",
    minAndroid: data.minAndroid || existingItem.minAndroid || "",
    targetSdk: data.targetSdk || existingItem.targetSdk || "",
    sha256: data.sha256 || existingItem.sha256 || "",
    note: data.note || existingItem.note || ""
  };
}

function renderUploadedUpdatePreview(item) {
  if (!item || !updateList) return;
  const key = getUpdateItemKey(item);
  const nextItems = [
    item,
    ...currentUpdateItems.filter((existing) => getUpdateItemKey(existing) !== key)
  ];
  renderUpdateItems(nextItems);
  if (updateStatus) {
    updateStatus.textContent = "本機修改已套用到目前畫面；重新整理後仍會優先顯示本機修改版。";
  }
}

async function deleteUpdateItem(index) {
  const item = currentUpdateItems[index];
  if (!item) throw new Error("找不到要移除的更新項目。");

  const itemName = item.name || item.id || item.packageName || "未命名 APK";
  if (!await requestUpdateEditorAccess("移除更新項目")) return;
  if (!window.confirm(`確定要從更新中心移除「${itemName}」？`)) return;

  const deleteButton = document.querySelector(`[data-update-delete="${index}"]`);
  if (deleteButton) deleteButton.disabled = true;
  if (updateStatus) updateStatus.textContent = `正在移除「${itemName}」...`;

  try {
    const result = await sendToCloud(getPayload("delete-update-app", {
      target: {
        manifestId: item.id || "",
        packageName: item.packageName || "",
        appName: item.name || "",
        name: item.name || "",
        apkUrl: item.apkUrl || ""
      }
    }));
    if (!result?.deleted) {
      throw new Error(result?.message || "雲端未回傳刪除完成。");
    }

    removeLocalUpdateOverride(item);
    const key = getUpdateItemKey(item);
    const nextItems = currentUpdateItems.filter((existing) => getUpdateItemKey(existing) !== key);
    if (updateDetail) {
      updateDetail.hidden = true;
      updateDetail.innerHTML = "";
    }
    renderUpdateItems(nextItems);
    if (updateStatus) updateStatus.textContent = `已移除「${itemName}」，正在重新讀取雲端清單。`;
    window.setTimeout(() => loadUpdateManifest(true), 700);
  } catch (error) {
    if (updateStatus) updateStatus.textContent = `移除失敗：${error.message || error}`;
    throw error;
  } finally {
    if (deleteButton) deleteButton.disabled = false;
  }
}

async function saveAndUploadUpdateApp() {
  if (!updateUploadForm) return;
  const apkInput = updateUploadForm.elements.apkFile;
  const apkFile = apkInput?.files?.[0] || null;
  const parsedApk = apkFile ? await ensureUpdateUploadApkInspection(apkFile) : null;

  if (!updateUploadForm.checkValidity()) {
    updateUploadForm.reportValidity();
    return;
  }

  const data = getUpdateUploadData();
  const submitButton = updateUploadForm.querySelector("[data-save-update-upload]");
  const isEditMode = Boolean(data.manifestId);
  const existingItem = getExistingUploadItem(data);
  const mergedData = mergeExistingUploadData(data, existingItem);
  const normalizedApkUrl = normalizeApkDownloadUrl(mergedData.apkUrl, apkFile);
  if (normalizedApkUrl !== mergedData.apkUrl) {
    mergedData.apkUrl = normalizedApkUrl;
    const apkUrlField = updateUploadForm.elements.apkUrl;
    if (apkUrlField) {
      clearPendingUploadField(apkUrlField, false);
      apkUrlField.value = normalizedApkUrl;
    }
  }

  if (!await requestUpdateEditorAccess(isEditMode ? "儲存修改" : "儲存新增")) return;

  if (!isEditMode && !mergedData.apkUrl) {
    setUpdateUploadStatus(`新增 App 需要先有 APK 下載地址。請先把 APK 上傳到 ${defaultApkReleaseTagUrl}；若檔名相同，選 APK 後系統會自動使用 GitHub Releases 下載網址。`, "error");
    return;
  }

  if (mergedData.apkUrl && !isDirectDownloadUrl(mergedData.apkUrl)) {
    setUpdateUploadStatus(`應用下載地址必須是可直接下載的 http/https 網址。若你已把 default.apk 上傳到 GitHub Releases，請填 ${getGithubReleaseDownloadUrl("default.apk")}，或只填 default.apk 讓系統自動補成下載網址。`, "error");
    return;
  }

  if (submitButton) submitButton.disabled = true;
  const workingText = mergedData.apkUrl
    ? "正在儲存下載網址與更新資料，並送出雲端同步..."
    : isEditMode
      ? "正在儲存修改資料，並送出雲端同步..."
      : "正在讀取小型檔案並送出雲端同步...";
  setUpdateUploadStatus(workingText, "working");

  try {
    if (!mergedData.appName && apkFile?.name) {
      mergedData.appName = apkFile.name.replace(/\.apk$/i, "");
      updateUploadForm.elements.appName.value = mergedData.appName;
    }
    if (!mergedData.sizeLabel && apkFile?.size) {
      mergedData.sizeLabel = formatFileSize(apkFile.size);
      updateUploadForm.elements.sizeLabel.value = mergedData.sizeLabel;
    }

    const files = {
      icon: null,
      firstImage: null,
      secondImage: null,
      apk: null
    };

    if (!mergedData.sizeLabel && files.apk?.sizeLabel) {
      mergedData.sizeLabel = files.apk.sizeLabel;
      updateUploadForm.elements.sizeLabel.value = mergedData.sizeLabel;
    }

    const cloudUpdateApp = buildCloudUpdateUploadData(mergedData, files);
    const previewManifestItem = buildUpdateManifestItem(mergedData, files);
    const cloudResult = await sendToCloud(getPayload("update-center-app", {
      updateApp: cloudUpdateApp,
      files
    }));
    const confirmedManifestItem = cloudResult?.item || previewManifestItem;

    saveLocalUpdateOverride(confirmedManifestItem);
    rememberLastUpdateUpload(mergedData, confirmedManifestItem);
    renderUploadedUpdatePreview(confirmedManifestItem);
    window.setTimeout(() => loadUpdateManifest(true), 800);

    const actionText = isEditMode ? "修改" : "新增";
    const apkText = mergedData.apkUrl
      ? "已使用 APK 下載網址；右側檔案只作為資訊解析，不會上傳到 Google Drive。"
      : isEditMode
        ? "雲端會沿用同一筆 App 原本的 APK 下載網址。"
        : "低權限 Apps Script 不保存 APK 檔案。";
    setUpdateUploadStatus(`已儲存${actionText}資料，雲端已回傳更新項目。${apkText} 正在重新讀取雲端清單。`, "success");
  } catch (error) {
    setUpdateUploadStatus(`儲存或上傳失敗：${error.message || error}`, "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function syncUpdateUploadFileLabels() {
  if (!updateUploadForm) return;
  updateUploadForm.querySelectorAll(".upload-button input[type='file']").forEach((input) => {
    const label = input.closest(".upload-button");
    if (!label) return;
    const target = getUpdateUploadFileTarget(input);
    label.dataset.defaultLabel = label.dataset.defaultLabel || label.textContent.trim();
    const updateLabel = (announce = false) => {
      const file = input.files?.[0];
      const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = file ? "重新選擇" : label.dataset.defaultLabel;
      label.title = file?.name || "";
      label.dataset.hasFile = file ? "true" : "false";
      if (input.name === "apkFile" && !file) {
        lastParsedUploadApk = null;
        clearExtractedApkIconPreview();
      }
      if (input.name === "iconFile" && file) {
        clearExtractedApkIconPreview();
      }
      if (file && target) {
        if (target.kind !== "apk") {
          try {
            assertInlineUploadSize(file, target.kind);
          } catch (error) {
            input.value = "";
            setPendingUploadFieldState(input, null);
            renderPendingUploadPreview(input, null);
            setUpdateUploadStatus(error.message || String(error), "error");
            return;
          }
        }
      }
      setPendingUploadFieldState(input, file);
      renderPendingUploadPreview(input, file);
      if (announce && file && target?.kind === "image") {
        setUpdateUploadStatus(`已選擇新圖片「${file.name}」，按「儲存並上傳」後會置換原圖片。`, "working");
      }
      if (file && input.name === "apkFile") {
        const apkUrlField = updateUploadForm.elements.apkUrl;
        const hasApkUrl = hasText(apkUrlField?.dataset.previousUploadValue)
          || (apkUrlField && !apkUrlField.classList.contains("has-pending-upload") && hasText(apkUrlField.value));
        if (hasApkUrl) {
          setUpdateUploadStatus("已填 APK 下載地址，送出時會使用網址並略過右側 APK 檔案。");
        } else if (file.size > maxInlineApkUploadBytes) {
          void inspectUpdateUploadApk(file).then(() => {
            setUpdateUploadStatus(`APK 資訊已讀取，但檔案 ${formatFileSize(file.size)} 太大，請先上傳到 GitHub Releases 或雲端空間，再把直接下載網址貼到「應用下載地址」。`, "error");
          });
          return;
        }
        void inspectUpdateUploadApk(file);
      }
    };
    if (!input.dataset.labelReady) {
      input.addEventListener("change", () => updateLabel(true));
      input.dataset.labelReady = "true";
    }
    updateLabel();
  });

  if (!updateUploadForm.dataset.resetReady) {
    updateUploadForm.addEventListener("reset", () => {
      const silentReset = updateUploadForm.dataset.silentReset === "true";
      delete updateUploadForm.dataset.silentReset;
      window.setTimeout(() => {
        lastParsedUploadApk = null;
        clearExtractedApkIconPreview();
        clearAllPendingUploadFields(false);
        if (!silentReset) setUpdateUploadMode("new");
        syncUpdateUploadFileLabels();
        if (!silentReset) setUpdateUploadStatus("表格已清除，可重新填寫後儲存。");
      }, 0);
    });
    updateUploadForm.dataset.resetReady = "true";
  }
}

function setUpdateUploadMode(mode = "new") {
  if (!updateUploadForm) return;
  const saveButton = updateUploadForm.querySelector("[data-save-update-upload]");
  updateUploadForm.dataset.mode = mode;
  if (saveButton) saveButton.textContent = mode === "edit" ? "儲存修改並上傳" : "儲存並上傳";
}

function setUpdateUploadField(name, value) {
  if (!updateUploadForm?.elements[name]) return;
  const field = updateUploadForm.elements[name];
  const text = String(value ?? "");
  if (field.tagName === "SELECT" && text && ![...field.options].some((option) => option.value === text)) {
    field.add(new Option(text, text));
  }
  clearPendingUploadField(field, false);
  field.value = text;
}

function resetUpdateUploadFormForNew() {
  if (!updateUploadForm) return;
  showUpdateUploadCard();
  updateUploadForm.dataset.silentReset = "true";
  updateUploadForm.reset();
  setUpdateUploadMode("new");
  setUpdateUploadField("manifestId", "");
  syncUpdateUploadFileLabels();
  setUpdateUploadStatus("已切換為新增模式。建議貼 GitHub Releases APK 下載地址；圖片可直接選檔上傳。");
  updateUploadCard?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function editUpdateUploadItem(index) {
  if (!updateUploadForm) return;
  const item = currentUpdateItems[index];
  if (!item) return;

  showUpdateUploadCard();
  updateUploadForm.dataset.silentReset = "true";
  updateUploadForm.reset();
  const galleryImages = Array.isArray(item.galleryImages) ? item.galleryImages : [];
  setUpdateUploadField("manifestId", item.id || normalizeUpdateItemId(item.packageName || item.name || item.apkUrl));
  setUpdateUploadField("iconUrl", item.iconUrl || "");
  setUpdateUploadField("appName", item.name || "");
  setUpdateUploadField("category", item.category || "");
  setUpdateUploadField("description", item.description || item.introduction || item.note || "");
  setUpdateUploadField("firstImageUrl", galleryImages[0] || item.imageUrl || "");
  setUpdateUploadField("secondImageUrl", galleryImages[1] || "");
  setUpdateUploadField("apkUrl", item.apkUrl || "");
  setUpdateUploadField("sizeLabel", item.sizeLabel || item.size || "");
  setUpdateUploadField("packageName", item.packageName || "");
  setUpdateUploadField("versionName", item.versionName || "");
  setUpdateUploadField("versionCode", item.versionCode || "");
  setUpdateUploadField("minAndroid", item.minAndroid || "");
  setUpdateUploadField("targetSdk", item.targetSdk || "");
  setUpdateUploadField("sha256", item.sha256 || "");

  const extra = updateUploadForm.querySelector(".update-upload-extra");
  if (extra && (item.minAndroid || item.targetSdk || item.sha256)) {
    extra.open = true;
  }

  setUpdateUploadMode("edit");
  syncUpdateUploadFileLabels();
  setUpdateUploadStatus(`正在修改「${item.name || item.id || "未命名 APK"}」。儲存後會送出雲端同步。`, "working");
  updateUploadCard?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderEmptyRecord() {
  recordCard.innerHTML = `
    <h3>目前沒有儲存紀錄</h3>
    <p>輸入後會保存在目前裝置；按「儲存並直接上傳」會送到申悅雲端。</p>
  `;
}

function renderRecord() {
  const record = getRecord();
  if (!Object.keys(record).length) {
    renderEmptyRecord();
    return;
  }

  const amountText = formatAmount(record.totalAmount);

  recordCard.innerHTML = `
    <h3>${hasText(record.owner) ? escapeHtml(record.owner) : "姓名未設定"}</h3>
    <p><strong>車主電話：</strong>${displayValue(record.phone)}</p>
    <p><strong>車牌號碼：</strong>${displayValue(record.plate)}</p>
    <p><strong>車款年分：</strong>${displayValue(record.car)}</p>
    <p><strong>其他產品類別：</strong>${displayValue(record.items)}</p>
    <p><strong>主機規格：</strong>${displayValue(record.model || record.productSpec)}</p>
    <p><strong>總收款金額：</strong>${amountText ? escapeHtml(amountText) : "未設定"}</p>
    <p><strong>安裝日期：</strong>${record.installDate ? formatDate(record.installDate) : "未設定"}</p>
    <p><strong>保固到期日：</strong>${record.warrantyDate ? formatDate(record.warrantyDate) : "未設定"}</p>
    <p><strong>備註：</strong>${displayValue(record.note)}</p>
  `;

  for (const [key, value] of Object.entries(record)) {
    const input = recordForm.elements[key];
    if (input) input.value = value;
  }
}

function buildWarrantyInfo(record = {}) {
  const amountText = formatAmount(record.totalAmount);
  const field = (label, value) => `${label}：${hasText(value) ? String(value).trim() : "未設定"}`;
  return [
    "申悅保固資訊",
    field("車主姓名", record.owner),
    field("車主電話", record.phone),
    field("車牌號碼", record.plate),
    field("車款年分", record.car),
    field("其他產品類別", record.items),
    field("主機規格", record.model || record.productSpec),
    field("總收款金額", amountText),
    field("安裝日期", record.installDate ? formatDate(record.installDate) : ""),
    field("保固到期日", record.warrantyDate ? formatDate(record.warrantyDate) : ""),
    field("備註", record.note)
  ].join("\n");
}

async function copyWarrantyInfo() {
  const data = cleanWarrantyRecord(Object.fromEntries(new FormData(recordForm).entries()));
  try {
    await copyText(buildWarrantyInfo(data));
    cloudStatus.textContent = "已複製保固資訊，可貼到 LINE、備忘錄或客戶紀錄。";
  } catch (error) {
    cloudStatus.textContent = `複製失敗：${error.message}`;
  }
}

function youtubeId(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url, location.href);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      return parsed.searchParams.get("v") || pathMatch?.[1] || "";
    }
  } catch {
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return shortMatch[1];
    const normalMatch = url.match(/[?&]v=([^?&]+)/);
    return normalMatch ? normalMatch[1] : "";
  }

  return "";
}

function youtubePlaylistId(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  try {
    return new URL(url, location.href).searchParams.get("list") || "";
  } catch {
    const match = url.match(/[?&]list=([^?&]+)/);
    return match ? match[1] : "";
  }
}

function youtubeEmbedUrl(value) {
  const id = youtubeId(value);
  const playlistId = youtubePlaylistId(value);
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1"
  });

  if (playlistId) params.set("list", playlistId);
  if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
  if (playlistId) return `https://www.youtube.com/embed/videoseries?${params.toString()}`;
  return "";
}

function vimeoEmbedUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url, location.href);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "player.vimeo.com") return url;
    if (!host.endsWith("vimeo.com")) return "";
    const id = parsed.pathname.split("/").find((segment) => /^\d+$/.test(segment));
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : "";
  } catch {
    return "";
  }
}

function isDirectVideoUrl(value) {
  return /\.(mp4|m4v|webm|ogv|ogg|mov|m3u8)(?:[?#].*)?$/i.test(String(value || ""));
}

function directVideoType(value) {
  const cleanUrl = String(value || "").split(/[?#]/)[0];
  const extension = cleanUrl.split(".").pop().toLowerCase();
  const types = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    ogg: "video/ogg",
    mov: "video/quicktime",
    m3u8: "application/vnd.apple.mpegurl"
  };
  return types[extension] || "video/mp4";
}

function getVideoSource(video = {}) {
  const rawUrl = String(video.embedUrl || video.videoUrl || video.url || "").trim();
  if (!rawUrl) return { kind: "empty", url: "" };
  if (isDirectVideoUrl(rawUrl)) {
    return { kind: "video", url: rawUrl, type: directVideoType(rawUrl) };
  }

  return {
    kind: "iframe",
    url: youtubeEmbedUrl(rawUrl) || vimeoEmbedUrl(rawUrl) || rawUrl
  };
}

function thumbUrl(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "assets/hero-car-audio.png";
}

function videoIdentity(video = {}) {
  const rawUrl = String(video.embedUrl || video.videoUrl || video.url || "").trim();
  return youtubeId(rawUrl) || rawUrl || String(video.title || "");
}

function sameVideo(left = {}, right = {}) {
  return videoIdentity(left) === videoIdentity(right);
}

function getVideoPlaylistItems(video = {}) {
  if (Array.isArray(video.playlistItems) && video.playlistItems.length) return video.playlistItems;
  if (!video.playlistKey) return [];
  return videos.filter((item) => item.playlistKey === video.playlistKey && !Array.isArray(item.playlistItems));
}

function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function getVideoSearchText(video = {}) {
  const playlistText = Array.isArray(video.playlistItems)
    ? video.playlistItems.map((item) => `${item.title} ${item.category}`).join(" ")
    : "";
  return `${video.title} ${video.category} ${playlistText}`;
}

function renderVideos() {
  const query = normalizeText(videoSearch.value || "");
  const filtered = videos.filter((video) => {
    const inCategory = activeVideoCategory === "all" || video.category === activeVideoCategory;
    const inQuery = normalizeText(getVideoSearchText(video)).includes(query);
    return inCategory && inQuery;
  });

  videoGrid.innerHTML = filtered.map((video) => {
    const originalIndex = videos.indexOf(video);
    return `
    <article class="video-card">
      <button class="video-thumb" type="button" data-video-open="${originalIndex}" aria-label="播放 ${escapeHtml(video.title)}">
        <img src="${thumbUrl(video.thumbnail || video.poster || video.url)}" alt="${escapeHtml(video.title)}" loading="lazy">
        <span>播放</span>
      </button>
      <div class="video-body">
        <h3>${escapeHtml(video.title)}</h3>
        <p>${escapeHtml(video.category)}</p>
        <button type="button" data-video-open="${originalIndex}">開啟教學</button>
      </div>
    </article>
  `;
  }).join("");
}

function getVideoModal() {
  let modal = document.querySelector("[data-video-modal]");
  if (modal) return modal;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="video-modal" data-video-modal hidden>
      <div class="video-modal-shell" data-video-shell role="dialog" aria-modal="true" aria-labelledby="video-modal-title">
        <div class="video-modal-top">
          <div>
            <h3 id="video-modal-title" data-video-modal-title></h3>
            <p data-video-modal-meta></p>
          </div>
          <div class="video-modal-actions">
            <button type="button" data-video-expand>放大</button>
            <button type="button" data-video-close>關閉</button>
          </div>
        </div>
        <div class="video-modal-content">
          <div class="video-player-frame" data-video-player></div>
          <aside class="video-playlist-panel" data-video-playlist hidden></aside>
        </div>
      </div>
    </div>
  `);

  return document.querySelector("[data-video-modal]");
}

function renderVideoFrame(player, video = {}) {
  const source = getVideoSource(video);
  const poster = thumbUrl(video.thumbnail || video.poster || video.url);

  if (source.kind === "video") {
    player.innerHTML = `
      <video controls autoplay playsinline poster="${escapeHtml(poster)}">
        <source src="${escapeHtml(source.url)}" type="${escapeHtml(source.type)}">
        您的裝置不支援此影片格式。
      </video>
    `;
  } else if (source.kind === "iframe") {
    player.innerHTML = `
      <iframe
        src="${escapeHtml(source.url)}"
        title="${escapeHtml(video.title)}"
        loading="eager"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"></iframe>
    `;
  } else {
    player.innerHTML = "";
  }
}

function renderVideoPlaylistPanel(modal, rootVideo = {}, playlist = [], activeIndex = 0) {
  const shell = modal.querySelector("[data-video-shell]");
  const panel = modal.querySelector("[data-video-playlist]");
  const hasPlaylist = playlist.length > 1;

  shell.classList.toggle("has-playlist", hasPlaylist);
  if (!hasPlaylist) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  const playlistTitle = rootVideo.playlistTitle || rootVideo.title || "播放清單";
  panel.hidden = false;
  panel.innerHTML = `
    <div class="video-playlist-heading">
      <h4>${escapeHtml(playlistTitle)}</h4>
      <p>${activeIndex + 1} / ${playlist.length}</p>
    </div>
    <div class="video-playlist-list">
      ${playlist.map((item, itemIndex) => `
        <button class="video-playlist-item${itemIndex === activeIndex ? " active" : ""}" type="button" data-video-playlist-open="${itemIndex}"${itemIndex === activeIndex ? ' aria-current="true"' : ""}>
          <img src="${thumbUrl(item.thumbnail || item.poster || item.url)}" alt="${escapeHtml(item.title)}" loading="lazy">
          <span>
            <small>${String(itemIndex + 1).padStart(2, "0")}</small>
            <strong>${escapeHtml(item.title)}</strong>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function openVideoPlayer(index, playlistIndex = null) {
  const rootVideo = videos[index];
  if (!rootVideo) return;

  const modal = getVideoModal();
  const wasHidden = modal.hidden;
  const title = modal.querySelector("[data-video-modal-title]");
  const meta = modal.querySelector("[data-video-modal-meta]");
  const player = modal.querySelector("[data-video-player]");
  const playlist = getVideoPlaylistItems(rootVideo);
  const requestedPlaylistIndex = Number(playlistIndex);
  const activeIndex = playlist.length
    ? Number.isFinite(requestedPlaylistIndex)
      ? Math.max(0, Math.min(requestedPlaylistIndex, playlist.length - 1))
      : Math.max(0, playlist.findIndex((item) => sameVideo(item, rootVideo)))
    : -1;
  const activeVideo = playlist.length ? playlist[activeIndex] || playlist[0] : rootVideo;

  if (wasHidden) lastFocusedVideoTrigger = document.activeElement;
  title.textContent = playlist.length && Array.isArray(rootVideo.playlistItems)
    ? rootVideo.title || activeVideo.title || ""
    : activeVideo.title || "";
  meta.textContent = playlist.length
    ? `${activeVideo.category || rootVideo.category || ""}｜${activeIndex + 1}/${playlist.length}`
    : activeVideo.category || "";
  modal.dataset.videoRootIndex = String(index);

  renderVideoFrame(player, activeVideo);
  renderVideoPlaylistPanel(modal, rootVideo, playlist, activeIndex);

  modal.hidden = false;
  document.body.classList.add("video-modal-open");
  if (wasHidden) modal.querySelector("[data-video-close]")?.focus({ preventScroll: true });
}

function closeVideoPlayer() {
  const modal = document.querySelector("[data-video-modal]");
  if (!modal || modal.hidden) return;

  modal.hidden = true;
  modal.classList.remove("is-expanded");
  modal.querySelector("[data-video-player]").innerHTML = "";
  modal.querySelector("[data-video-shell]")?.classList.remove("has-playlist");
  const playlistPanel = modal.querySelector("[data-video-playlist]");
  if (playlistPanel) {
    playlistPanel.hidden = true;
    playlistPanel.innerHTML = "";
  }
  delete modal.dataset.videoRootIndex;
  document.body.classList.remove("video-modal-open");

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  if (lastFocusedVideoTrigger && typeof lastFocusedVideoTrigger.focus === "function") {
    lastFocusedVideoTrigger.focus({ preventScroll: true });
  }
  lastFocusedVideoTrigger = null;
}

function toggleVideoExpand() {
  const modal = document.querySelector("[data-video-modal]");
  const shell = document.querySelector("[data-video-shell]");
  if (!modal || !shell) return;

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }
  if (shell.requestFullscreen) {
    shell.requestFullscreen().catch(() => modal.classList.toggle("is-expanded"));
    return;
  }
  modal.classList.toggle("is-expanded");
}

function hasNativeUpdater() {
  return Boolean(window.ShenYueUpdater);
}

function parseNativeResult(raw) {
  try {
    return JSON.parse(raw || "{}");
  } catch (error) {
    return { ok: false, message: "Android 回傳資料格式錯誤。" };
  }
}

function getErrorMessage(error) {
  return error?.message || String(error || "未知錯誤");
}

function initUpdateCenter(force = false) {
  if (!updateUrlInput || (!force && updateCenterLoaded)) return;
  updateCenterLoaded = true;
  updateUrlInput.value = getPreferredUpdateManifestUrl();
  renderUpdateDeviceState();
  loadUpdateManifest(force);
}

function renderUpdateDeviceState() {
  if (!updateDevice) return;
  if (!hasNativeUpdater()) {
    updateDevice.textContent = "目前是瀏覽器模式，只能查看清單；安裝與版本偵測需在 Android APK 內使用。";
    return;
  }

  const state = parseNativeResult(window.ShenYueUpdater.getDeviceState());
  if (!state.ok) {
    updateDevice.textContent = `Android 狀態讀取失敗：${state.message || "未知錯誤"}`;
    return;
  }

  const permission = state.canRequestPackageInstalls ? "已允許安裝 APK" : "尚未允許安裝未知來源";
  updateDevice.textContent = `本機助手：${state.packageName}｜目前版本 ${state.versionName} (${state.versionCode})｜${permission}${state.lastInstallStatus ? `｜${state.lastInstallStatus}` : ""}`;
}

function loadBundledManifest(remoteError) {
  if (!hasNativeUpdater() || typeof window.ShenYueUpdater.getBundledManifest !== "function") {
    return false;
  }

  try {
    const manifest = JSON.parse(window.ShenYueUpdater.getBundledManifest() || "{}");
    const items = Array.isArray(manifest.apps) ? manifest.apps : [];
    if (!items.length && manifest.error) throw new Error(manifest.error);
    currentUpdateManifestUrl = "updates.json";
    updateStatus.textContent = `雲端清單讀取失敗（${getErrorMessage(remoteError)}），已使用 App 內建清單。項目：${items.length}`;
    renderUpdateItems(items);
    return true;
  } catch {
    return false;
  }
}

function getUpdateManifestCandidates(primaryUrl) {
  const urls = [];
  const seen = new Set();
  const add = (url) => {
    const text = String(url || "").trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    urls.push(text);
  };

  add(primaryUrl || defaultUpdateManifestUrl);
  add(getCloudUpdateManifestUrl());
  add(fallbackUpdateManifestUrl);
  add(legacyUpdateManifestUrl);
  add("updates.json");
  return urls;
}

async function fetchUpdateManifestFromUrl(manifestUrl) {
  const response = await fetch(appendQueryParam(manifestUrl, "t", Date.now()), { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const manifest = await response.json();
  if (!Array.isArray(manifest.apps)) {
    const detail = manifest?.message ? `：${manifest.message}` : "";
    throw new Error(`雲端更新清單缺少 apps${detail}`);
  }
  return manifest;
}

async function loadUpdateManifest(force = false) {
  if (!updateStatus || !updateList || !updateUrlInput) return;
  const manifestUrl = updateUrlInput.value.trim() || defaultUpdateManifestUrl;
  localStorage.setItem(updateUrlKey, manifestUrl);
  updateStatus.textContent = "正在讀取雲端更新清單...";
  updateList.innerHTML = "";
  const errors = [];

  for (const candidateUrl of getUpdateManifestCandidates(manifestUrl)) {
    try {
      const manifest = await fetchUpdateManifestFromUrl(candidateUrl);
      const items = manifest.apps;
      currentUpdateManifestUrl = candidateUrl;
      const sourceText = candidateUrl === manifestUrl ? "雲端清單" : "備用雲端清單";
      updateStatus.textContent = `已讀取 ${items.length} 個更新項目（${sourceText}）。更新時間：${manifest.updatedAt || "未標示"}`;
      renderUpdateItems(items);
      return;
    } catch (error) {
      errors.push(`${candidateUrl}：${getErrorMessage(error)}`);
    }
  }

  if (loadBundledManifest(new Error(errors.join(" / ")))) {
    return;
  }

  updateStatus.textContent = `雲端與內建清單都讀取失敗：${errors.join(" / ")}`;
  if (force) renderUpdateItems([]);
}

function getInstalledMap(items) {
  const map = new Map();
  if (!hasNativeUpdater()) return map;

  const packageNames = [...new Set(items.map((item) => item.packageName).filter(Boolean))];
  const batch = parseNativeResult(window.ShenYueUpdater.getInstalledBatch(JSON.stringify(packageNames)));
  if (!batch.ok || !Array.isArray(batch.items)) return map;

  batch.items.forEach((item) => {
    map.set(item.packageName, item);
  });
  return map;
}

function renderUpdateItems(items) {
  if (!updateList) return;
  const displayItems = mergeUpdateOverrides(items);
  currentUpdateItems = displayItems;
  if (!displayItems.length) {
    updateList.innerHTML = `<article class="update-card"><h3>沒有可顯示的更新項目</h3><p>請確認 updates.json 的 apps 陣列格式是否正確。</p></article>`;
    if (updateDetail) updateDetail.hidden = true;
    return;
  }

  currentInstalledMap = getInstalledMap(displayItems);
  updateList.innerHTML = displayItems.map((item, index) => renderUpdateIcon(item, currentInstalledMap.get(item.packageName), index)).join("");
  if (updateDetail) {
    updateDetail.hidden = true;
    updateDetail.innerHTML = "";
  }
}

function getUpdateState(item, installed) {
  const remoteCode = Number(item.versionCode || 0);
  const currentCode = Number(installed?.versionCode || 0);
  const apkUrl = item.apkUrl || "";

  let pill = "可安裝";
  let pillClass = "ready";
  let buttonText = installed?.installed ? "下載更新" : "下載安裝";
  let disabled = !hasNativeUpdater() || !apkUrl || !item.packageName;
  let reason = "";

  if (!hasNativeUpdater()) {
    pill = "瀏覽器模式";
    pillClass = "error";
    reason = "請在 Android APK 內開啟才可偵測與安裝。";
  } else if (!apkUrl || !item.packageName) {
    pill = "資料不完整";
    pillClass = "error";
    reason = "updates.json 缺少 packageName 或 apkUrl。";
  } else if (installed?.installed && remoteCode > 0 && currentCode >= remoteCode) {
    pill = "已是最新";
    pillClass = "current";
    buttonText = "排除重複安裝";
    disabled = true;
    reason = "遠端版本碼未高於目前版本，已自動排除重複安裝。";
  } else if (!installed?.installed) {
    pill = "未安裝";
    pillClass = "missing";
  }

  return { pill, pillClass, buttonText, disabled, reason, remoteCode, currentCode };
}

function renderUpdateIcon(item, installed, index) {
  const state = getUpdateState(item, installed);

  return `
    <button class="update-icon-card" type="button" data-update-open="${index}">
      <span class="status-pill ${state.pillClass}">${state.pill}</span>
      <strong>${escapeHtml(item.name || item.id || "未命名 APK")}</strong>
      <small>${escapeHtml(item.versionName || "版本未標示")}</small>
    </button>
  `;
}

function renderUpdateDetailPage(index) {
  if (!updateDetail) return;
  const item = currentUpdateItems[index];
  if (!item) return;

  const installed = currentInstalledMap.get(item.packageName);
  const state = getUpdateState(item, installed);
  const remoteCode = Number(item.versionCode || 0);
  const currentCode = Number(installed?.versionCode || 0);
  const installedText = installed?.installed ? `${escapeHtml(installed.versionName || "")} (${currentCode})` : "尚未安裝";
  const remoteText = `${escapeHtml(item.versionName || "")} (${remoteCode || "未填"})`;
  const changelog = Array.isArray(item.changelog) ? item.changelog.join("、") : (item.changelog || item.note || "");
  const iconUrl = resolveManifestRelativeUrl(item.iconUrl || item.imageUrl, "assets/app-logo.png");
  const description = item.description || item.introduction || changelog || item.note || "此 APK 尚未填寫介紹。";
  const targetSdkText = item.targetSdk ? `SDK ${escapeHtml(item.targetSdk)}` : "未標示";
  const galleryImages = Array.isArray(item.galleryImages) ? item.galleryImages.slice(0, 2) : [];
  while (galleryImages.length < 2) galleryImages.push("");
  const galleryHtml = galleryImages.map((url, slot) => {
    const imageUrl = resolveManifestRelativeUrl(url, "assets/update-splash.png");
    return `
      <figure class="update-gallery-slot">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name || "APK")} 圖片位置 ${slot + 1}" loading="lazy" onerror="this.onerror=null;this.src='assets/update-splash.png';">
        <figcaption>圖片位置 ${slot + 1}</figcaption>
      </figure>
    `;
  }).join("");

  updateDetail.hidden = false;
  updateDetail.innerHTML = `
    <div class="update-detail-top">
      <div class="update-detail-actions">
        <button class="secondary-button" type="button" data-update-back>返回圖標清單</button>
        <button class="secondary-button" type="button" data-update-new>新增應用</button>
        <button class="secondary-button" type="button" data-update-edit="${index}">修改資料</button>
        <button class="secondary-button danger-button" type="button" data-update-delete="${index}">移除應用</button>
      </div>
      <span class="status-pill ${state.pillClass}">${state.pill}</span>
    </div>
    <article class="update-card" data-update-card="${index}">
      <header>
        <div>
          <h3>${escapeHtml(item.name || item.id || "未命名 APK")}</h3>
        </div>
      </header>
      <div class="update-card-body">
        <div class="update-icon-panel">
          <img class="update-detail-icon" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(item.name || "APK")} 圖標" loading="lazy" onerror="this.onerror=null;this.src='assets/app-logo.png';">
          <span>${escapeHtml(item.name || "APK")}</span>
        </div>
        <div class="update-copy-area copyable-text">
          <p class="update-description">${escapeHtml(description)}</p>
        </div>
      </div>
      <div class="update-gallery-grid">${galleryHtml}</div>
      <div class="update-meta">
        <span><strong>目前版本</strong><br>${installedText}</span>
        <span><strong>雲端版本</strong><br>${remoteText}</span>
        <span><strong>大小</strong><br>${escapeHtml(item.sizeLabel || item.size || "未標示")}</span>
        <span><strong>最低 / 目標 SDK</strong><br>${escapeHtml(item.minAndroid || "未標示")} / ${targetSdkText}</span>
      </div>
      <p class="update-note copyable-text">${escapeHtml(state.reason || changelog || "沒有填寫更新內容。")}</p>
      <div class="update-progress" data-update-progress><span></span></div>
      <button type="button" data-update-install="${index}" ${state.disabled ? "disabled" : ""}>${state.buttonText}</button>
    </article>
  `;
  updateDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderUpdateCard(item, installed, index) {
  const state = getUpdateState(item, installed);
  const remoteCode = Number(item.versionCode || 0);
  const currentCode = Number(installed?.versionCode || 0);
  const installedText = installed?.installed ? `${escapeHtml(installed.versionName || "")} (${currentCode})` : "尚未安裝";
  const remoteText = `${escapeHtml(item.versionName || "")} (${remoteCode || "未填"})`;
  const changelog = Array.isArray(item.changelog) ? item.changelog.join("、") : (item.changelog || item.note || "");
  const iconUrl = resolveManifestRelativeUrl(item.iconUrl || item.imageUrl, "assets/app-logo.png");
  const description = item.description || item.introduction || changelog || item.note || "此 APK 尚未填寫介紹。";
  const targetSdkText = item.targetSdk ? `SDK ${escapeHtml(item.targetSdk)}` : "未標示";
  const galleryImages = Array.isArray(item.galleryImages) ? item.galleryImages.slice(0, 2) : [];
  while (galleryImages.length < 2) galleryImages.push("");
  const galleryHtml = galleryImages.map((url, slot) => {
    const imageUrl = resolveManifestRelativeUrl(url, "assets/update-splash.png");
    return `
      <figure class="update-gallery-slot">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name || "APK")} 圖片位置 ${slot + 1}" loading="lazy" onerror="this.onerror=null;this.src='assets/update-splash.png';">
        <figcaption>圖片位置 ${slot + 1}</figcaption>
      </figure>
    `;
  }).join("");

  return `
    <article class="update-card" data-update-card="${index}">
      <header>
        <div>
          <h3>${escapeHtml(item.name || item.id || "未命名 APK")}</h3>
        </div>
        <span class="status-pill ${state.pillClass}">${state.pill}</span>
      </header>
      <div class="update-card-body">
        <div class="update-icon-panel">
          <img class="update-detail-icon" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(item.name || "APK")} 圖標" loading="lazy" onerror="this.onerror=null;this.src='assets/app-logo.png';">
          <span>${escapeHtml(item.name || "APK")}</span>
        </div>
        <div class="update-copy-area copyable-text">
          <p class="update-description">${escapeHtml(description)}</p>
        </div>
      </div>
      <div class="update-gallery-grid">${galleryHtml}</div>
      <div class="update-meta">
        <span><strong>目前版本</strong><br>${installedText}</span>
        <span><strong>雲端版本</strong><br>${remoteText}</span>
        <span><strong>大小</strong><br>${escapeHtml(item.sizeLabel || item.size || "未標示")}</span>
        <span><strong>最低 / 目標 SDK</strong><br>${escapeHtml(item.minAndroid || "未標示")} / ${targetSdkText}</span>
      </div>
      <p class="update-note copyable-text">${escapeHtml(state.reason || changelog || "沒有填寫更新內容。")}</p>
      <div class="update-progress" data-update-progress><span></span></div>
      <button type="button" data-update-install="${index}" ${state.disabled ? "disabled" : ""}>${state.buttonText}</button>
    </article>
  `;
}

async function installUpdateFromCard(index) {
  const item = currentUpdateItems[index];
  if (!item) throw new Error("找不到更新項目。");
  const nativeItem = {
    ...item,
    apkUrl: resolveManifestRelativeUrl(item.apkUrl)
  };

  const card = document.querySelector(`[data-update-card="${index}"]`);
  const button = document.querySelector(`[data-update-install="${index}"]`);
  const note = card?.querySelector(".update-note");
  const progress = card?.querySelector("[data-update-progress] span");
  if (!card || !button || !hasNativeUpdater()) return;

  button.disabled = true;
  if (note) note.textContent = "正在交給 Android 下載安裝服務...";
  const started = parseNativeResult(window.ShenYueUpdater.downloadAndInstall(JSON.stringify(nativeItem)));
  if (!started.ok) {
    if (note) note.textContent = started.message || "無法開始下載。";
    button.disabled = false;
    renderUpdateDeviceState();
    return;
  }

  const timer = setInterval(() => {
    const task = parseNativeResult(window.ShenYueUpdater.getTaskStatus(started.taskId));
    if (progress) progress.style.setProperty("--progress", `${task.progress || 0}%`);
    if (note) note.textContent = task.message || "";
    if (["failed", "complete", "installing"].includes(task.status)) {
      clearInterval(timer);
      renderUpdateDeviceState();
    }
  }, 700);
}

function switchTab(tabId) {
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === tabId);
  });
  if (tabId === "updates") {
    initUpdateCenter();
  }
  const panel = document.getElementById(tabId);
  if (panel) {
    if (location.hash !== `#${tabId}`) history.replaceState(null, "", `#${tabId}`);
    panel.scrollIntoView({ behavior: tabScrollBehavior, block: "start" });
  }
}

function restoreChecklist() {
  if (!checklist) return;
  const saved = JSON.parse(localStorage.getItem(checklistKey) || "[]");
  checklist.querySelectorAll("input").forEach((input, index) => {
    input.checked = Boolean(saved[index]);
  });
}

async function saveAndUploadWarranty() {
  if (!recordForm.reportValidity()) return;
  const data = cleanWarrantyRecord(Object.fromEntries(new FormData(recordForm).entries()));
  localStorage.setItem(storageKey, JSON.stringify(data));
  renderRecord();
  cloudStatus.textContent = "正在上傳保固資料到 Apps Script...";
  try {
    const result = await sendToCloud(getPayload("iphone-warranty", data));
    cloudStatus.textContent = `保固資料已寫入 Google 試算表第 ${result.row} 列。`;
  } catch (error) {
    cloudStatus.textContent = `上傳失敗：${error.message}`;
  }
}

if (updateUploadForm) {
  updateUploadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAndUploadUpdateApp();
  });
}

recordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveAndUploadWarranty();
});

document.querySelector("[data-save-upload-warranty]").addEventListener("click", saveAndUploadWarranty);

document.querySelector("[data-copy-warranty]").addEventListener("click", copyWarrantyInfo);

document.querySelector("[data-clear-warranty]").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  localStorage.removeItem("shenYueWarrantyPhotos");
  localStorage.removeItem("shenYueWarrantyPhotoCache");
  localStorage.removeItem("shenYueCarWarrantyPhotos");
  recordForm.reset();
  renderEmptyRecord();
  cloudStatus.textContent = "本機保固資料已清除。";
});

document.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("[data-tab-target]");
  if (tabButton) {
    switchTab(tabButton.dataset.tabTarget);
    return;
  }

  const refreshUpdates = event.target.closest("[data-refresh-updates]");
  if (refreshUpdates) {
    initUpdateCenter(true);
    return;
  }

  const updateEditorHide = event.target.closest("[data-update-editor-hide]");
  if (updateEditorHide) {
    hideUpdateUploadCard();
    return;
  }

  const updateNew = event.target.closest("[data-update-new]");
  if (updateNew) {
    if (!await requestUpdateEditorAccess("新增更新項目")) return;
    resetUpdateUploadFormForNew();
    return;
  }

  const updateEdit = event.target.closest("[data-update-edit]");
  if (updateEdit) {
    if (!await requestUpdateEditorAccess("修改更新項目")) return;
    editUpdateUploadItem(Number(updateEdit.dataset.updateEdit));
    return;
  }

  const updateDelete = event.target.closest("[data-update-delete]");
  if (updateDelete) {
    const index = Number(updateDelete.dataset.updateDelete);
    deleteUpdateItem(index).catch((error) => {
      updateDelete.disabled = false;
      if (updateStatus) updateStatus.textContent = `移除失敗：${error.message || error}`;
    });
    return;
  }

  const updateBack = event.target.closest("[data-update-back]");
  if (updateBack) {
    if (updateDetail) {
      updateDetail.hidden = true;
      updateDetail.innerHTML = "";
    }
    updateList?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const updateOpen = event.target.closest("[data-update-open]");
  if (updateOpen) {
    renderUpdateDetailPage(Number(updateOpen.dataset.updateOpen));
    return;
  }

  const installPermission = event.target.closest("[data-open-install-permission]");
  if (installPermission) {
    if (hasNativeUpdater()) {
      window.ShenYueUpdater.openInstallPermission();
    } else if (updateStatus) {
      updateStatus.textContent = "瀏覽器模式無法開啟 Android 安裝權限，請在 APK 內使用。";
    }
    return;
  }

  const updateInstall = event.target.closest("[data-update-install]");
  if (updateInstall) {
    const index = Number(updateInstall.dataset.updateInstall);
    installUpdateFromCard(index).catch((error) => {
      const card = document.querySelector(`[data-update-card="${index}"]`);
      const note = card?.querySelector(".update-note");
      if (note) note.textContent = `無法開始更新：${error.message || error}`;
      updateInstall.disabled = false;
    });
    return;
  }

  const videoOpen = event.target.closest("[data-video-open]");
  if (videoOpen) {
    event.preventDefault();
    openVideoPlayer(Number(videoOpen.dataset.videoOpen));
    return;
  }

  const videoPlaylistOpen = event.target.closest("[data-video-playlist-open]");
  if (videoPlaylistOpen) {
    event.preventDefault();
    const modal = document.querySelector("[data-video-modal]");
    const rootIndex = Number(modal?.dataset.videoRootIndex);
    if (Number.isFinite(rootIndex)) {
      openVideoPlayer(rootIndex, Number(videoPlaylistOpen.dataset.videoPlaylistOpen));
    }
    return;
  }

  const videoClose = event.target.closest("[data-video-close]");
  if (videoClose) {
    event.preventDefault();
    closeVideoPlayer();
    return;
  }

  const videoExpand = event.target.closest("[data-video-expand]");
  if (videoExpand) {
    event.preventDefault();
    toggleVideoExpand();
    return;
  }

  if (event.target.matches("[data-video-modal]")) {
    closeVideoPlayer();
    return;
  }

  const videoFilter = event.target.closest("[data-video-filter]");
  if (videoFilter) {
    activeVideoCategory = videoFilter.dataset.videoFilter;
    document.querySelectorAll("[data-video-filter]").forEach((button) => {
      button.classList.toggle("active", button === videoFilter);
    });
    renderVideos();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeVideoPlayer();
  }
});

videoSearch.addEventListener("input", renderVideos);

if (checklist) {
  checklist.addEventListener("change", () => {
    const values = [...checklist.querySelectorAll("input")].map((input) => input.checked);
    localStorage.setItem(checklistKey, JSON.stringify(values));
  });
}

document.querySelector("[data-reset-checklist]")?.addEventListener("click", () => {
  localStorage.removeItem(checklistKey);
  restoreChecklist();
});

adminShortcut.addEventListener("click", () => {
  switchTab("admin");
  const input = document.querySelector("[data-admin-pin]");
  input.placeholder = "請輸入管理 PIN";
  input.focus();
});

document.querySelector("[data-admin-login]").addEventListener("click", async () => {
  const input = document.querySelector("[data-admin-pin]");
  if (!await verifyAdminPin(input.value)) {
    input.value = "";
    input.placeholder = "PIN 錯誤";
    return;
  }

  adminUnlocked = true;
  adminPanel.hidden = false;
  const settings = getAdminSettings();
  const form = document.querySelector("[data-admin-form]");
  form.elements.cloudEndpoint.value = settings.cloudEndpoint || "";
  form.elements.warrantyEndpoint.value = settings.warrantyEndpoint || "";
  form.elements.contentConfigUrl.value = settings.contentConfigUrl || "";
  form.elements.heroTitle.value = settings.heroTitle || defaultContent.heroTitle;
  form.elements.shopPhone.value = settings.shopPhone || "0970-117-708";
  form.elements.lineId.value = settings.lineId || currentLineId;
  adminOutput.textContent = "管理模式已開啟。\n可設定雲端網址、測試連線、匯出本機資料。";
});

document.querySelector("[data-admin-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  data.cloudEndpoint = normalizeCloudEndpoint(data.cloudEndpoint);
  data.warrantyEndpoint = normalizeWarrantyEndpoint(data.warrantyEndpoint);
  data.contentConfigUrl = normalizeContentConfigUrl(data.contentConfigUrl);
  data.lineId = normalizeLineId(data.lineId);
  localStorage.setItem(adminKey, JSON.stringify(data));
  applyContent({ heroTitle: data.heroTitle });
  adminOutput.textContent = `已儲存管理設定：\n${JSON.stringify(data, null, 2)}`;
  const updateManifestUrl = getCloudUpdateManifestUrl();
  localStorage.setItem(updateUrlKey, updateManifestUrl);
  if (updateUrlInput) updateUrlInput.value = updateManifestUrl;
  cloudStatus.textContent = "已設定雲端網址，可上傳保固資料與更新中心資料。";
});

document.querySelector("[data-load-content]").addEventListener("click", () => {
  loadRemoteContent(true);
});

document.querySelector("[data-test-cloud]").addEventListener("click", async () => {
  try {
    await sendToCloud(getPayload("test", { message: "申悅助手雲端測試" }));
    adminOutput.textContent = "測試資料已送出。請到 Google 試算表確認。";
  } catch (error) {
    adminOutput.textContent = `測試失敗：${error.message}`;
  }
});

document.querySelector("[data-test-warranty-cloud]")?.addEventListener("click", async () => {
  try {
    const result = await sendToCloud(getPayload("iphone-warranty", {
      owner: "雲端測試",
      phone: "0000",
      plate: "TEST",
      car: "Apps Script",
      items: "保固寫入測試",
      model: "SY-B8 八核 2g+64g",
      installDate: new Date().toISOString().slice(0, 10),
      warrantyDate: new Date().toISOString().slice(0, 10),
      totalAmount: "0",
      note: "管理設定測試保固寫入，可確認後刪除"
    }));
    adminOutput.textContent = `保固測試已寫入 Google 試算表第 ${result.row} 列。`;
  } catch (error) {
    adminOutput.textContent = `保固測試失敗：${error.message}`;
  }
});

document.querySelector("[data-export-data]").addEventListener("click", () => {
  const data = {
    warranty: getRecord(),
    admin: getAdminSettings(),
    checklist: checklist ? JSON.parse(localStorage.getItem(checklistKey) || "[]") : []
  };
  adminOutput.textContent = JSON.stringify(data, null, 2);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

window.addEventListener("pageshow", () => checkRemoteContentNow());
if (!isAndroidApk) {
  window.addEventListener("focus", () => checkRemoteContentNow());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkRemoteContentNow();
  });
}

migrateLegacyData();
renderRecord();
restoreChecklist();
renderVideos();
syncUpdateUploadFileLabels();
if (updateUrlInput) {
  updateUrlInput.value = getPreferredUpdateManifestUrl();
}
if (location.hash) {
  const tabId = location.hash.slice(1);
  if (document.getElementById(tabId)?.matches("[data-tab-panel]")) {
    switchTab(tabId);
  }
}
checkRemoteContentNow({ force: true });
cloudStatus.textContent = "已設定申悅雲端網址，可上傳保固資料與更新中心資料。";
