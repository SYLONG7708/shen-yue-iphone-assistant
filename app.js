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
const defaultCloudDeploymentId = "AKfycbxcIrA3syOcg6qCriinVl5KoUt20EnkOIdrW6kXM1OSM5dFZq1qUISkU8Ke8NJQPWuz";
const defaultCloudEndpoint = `https://script.google.com/macros/s/${defaultCloudDeploymentId}/exec`;
const defaultContentConfigUrl = "shen-yue-assistant-content.json";
const legacyUpdateManifestUrl = "https://sylong7708.github.io/shen-yue-iphone-assistant/updates.json";
const fallbackUpdateManifestUrl = "https://raw.githubusercontent.com/SYLONG7708/update/main/updates.json";
const defaultUpdateManifestUrl = `${defaultCloudEndpoint}?type=updates`;
const maxInlineImageUploadBytes = 8 * 1024 * 1024;
const maxInlineApkUploadBytes = 24 * 1024 * 1024;
const updateUploadFileTargets = {
  iconFile: { fieldName: "iconUrl", kind: "image", label: "應用圖標" },
  firstImageFile: { fieldName: "firstImageUrl", kind: "image", label: "第一張圖片" },
  secondImageFile: { fieldName: "secondImageUrl", kind: "image", label: "第二張圖片" },
  apkFile: { fieldName: "apkUrl", kind: "apk", label: "小 APK" }
};
const currentLineId = "@585eeefp";
const legacyLineIds = new Set(["7708LUNG", "@7708LUNG", "7708lung", "@7708lung"]);
const legacyCloudEndpoints = new Set([
  "https://script.google.com/macros/s/AKfycbxxtXq2JnoqYHU7rHDo4Ddfe_ZfPzwDolglZsbBmY2j1YUkV1fbqcFv8KhNh-stPL8/exec"
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

function normalizeCloudEndpoint(value) {
  const text = String(value || "").trim();
  if (!text || legacyCloudEndpoints.has(text)) return defaultCloudEndpoint;
  if (text.includes(defaultCloudDeploymentId)) return defaultCloudEndpoint;
  if (text.includes("script.google.com/macros/s/")) return defaultCloudEndpoint;
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
      const nextAdmin = {
        ...savedAdmin,
        cloudEndpoint: normalizeCloudEndpoint(savedAdmin.cloudEndpoint),
        lineId: normalizeLineId(savedAdmin.lineId)
      };
      if (JSON.stringify(nextAdmin) !== JSON.stringify(savedAdmin)) {
        localStorage.setItem(adminKey, JSON.stringify(nextAdmin));
      }
    }
  } catch {
    localStorage.removeItem(adminKey);
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
    contentConfigUrl: defaultContentConfigUrl,
    heroTitle: defaultContent.heroTitle,
    shopPhone: "0970-117-708",
    lineId: currentLineId,
    ...saved
  };
  settings.lineId = normalizeLineId(settings.lineId);
  settings.cloudEndpoint = normalizeCloudEndpoint(settings.cloudEndpoint);
  if (!settings.contentConfigUrl || String(settings.contentConfigUrl).includes("shen-yue.com.tw")) {
    settings.contentConfigUrl = defaultContentConfigUrl;
  }
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

function checkRemoteContentNow() {
  const now = Date.now();
  if (now - lastRemoteContentCheck < 3000) return;
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
  const { cloudEndpoint } = getAdminSettings();
  if (!cloudEndpoint) throw new Error("尚未設定 Google Apps Script 雲端網址");

  await fetch(cloudEndpoint, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
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
    throw new Error(`APK 檔案 ${fileLabel} 太大，請先上傳到 GitHub Releases、Google Drive 或其他免費空間，再把直接下載網址貼到「應用下載地址」。本表格只直接上傳 ${limitLabel} 以下的小 APK。`);
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
  if (files.icon) cloudData.iconUrl = "";
  if (files.firstImage) cloudData.firstImageUrl = "";
  if (files.secondImage) cloudData.secondImageUrl = "";
  if (files.apk && String(cloudData.apkUrl || "").startsWith("待上傳")) cloudData.apkUrl = "";
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

async function saveAndUploadUpdateApp() {
  if (!updateUploadForm) return;
  if (!updateUploadForm.checkValidity()) {
    updateUploadForm.reportValidity();
    return;
  }

  const data = getUpdateUploadData();
  const apkInput = updateUploadForm.elements.apkFile;
  const apkFile = apkInput?.files?.[0] || null;
  const submitButton = updateUploadForm.querySelector("[data-save-update-upload]");
  const isEditMode = Boolean(data.manifestId);
  const existingItem = getExistingUploadItem(data);
  const mergedData = mergeExistingUploadData(data, existingItem);

  if (!await requestUpdateEditorAccess(isEditMode ? "儲存修改" : "儲存新增")) return;

  if (!isEditMode && !mergedData.apkUrl && !apkFile) {
    setUpdateUploadStatus("新增 App 才需要 APK 下載地址或小型 APK 檔案。若只是改 APK 名稱，請先點下方 App 項目，再按「修改資料」。", "error");
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
      icon: await readUploadFile(updateUploadForm.elements.iconFile?.files?.[0], "image"),
      firstImage: await readUploadFile(updateUploadForm.elements.firstImageFile?.files?.[0], "image"),
      secondImage: await readUploadFile(updateUploadForm.elements.secondImageFile?.files?.[0], "image"),
      apk: mergedData.apkUrl ? null : await readUploadFile(apkFile, "apk")
    };

    if (!mergedData.sizeLabel && files.apk?.sizeLabel) {
      mergedData.sizeLabel = files.apk.sizeLabel;
      updateUploadForm.elements.sizeLabel.value = mergedData.sizeLabel;
    }

    const localManifestItem = buildUpdateManifestItem(mergedData, files);
    saveLocalUpdateOverride(localManifestItem);
    const cloudUpdateApp = buildCloudUpdateUploadData(mergedData, files);

    rememberLastUpdateUpload(mergedData, localManifestItem);
    renderUploadedUpdatePreview(localManifestItem);

    await sendToCloud(getPayload("update-center-app", {
      updateApp: cloudUpdateApp,
      files
    }));
    window.setTimeout(() => loadUpdateManifest(true), 1800);

    const actionText = isEditMode ? "修改" : "新增";
    const apkText = mergedData.apkUrl
      ? "已使用 APK 下載網址，沒有上傳右側 APK 檔案。"
      : isEditMode
        ? "雲端會沿用同一筆 App 原本的 APK 下載網址；若有選新檔案也會送到 Google Drive。"
        : "小型 APK 檔案已送到 Apps Script，會由 Google Drive 產生下載網址。";
    setUpdateUploadStatus(`已儲存${actionText}資料並送出雲端同步。${apkText} 請按「重新整理」讀取雲端清單。`, "success");
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
      if (file && target) {
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
          setUpdateUploadStatus(`APK 檔案 ${formatFileSize(file.size)} 太大，請先上傳到免費空間，再把直接下載網址貼到「應用下載地址」。`, "error");
        }
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
    <p><strong>聯繫電話：</strong>${displayValue(record.phone)}</p>
    <p><strong>車牌號碼：</strong>${displayValue(record.plate)}</p>
    <p><strong>車款年份：</strong>${displayValue(record.car)}</p>
    <p><strong>安裝項目：</strong>${displayValue(record.items)}</p>
    <p><strong>主機規格：</strong>${displayValue(record.model || record.productSpec)}</p>
    <p><strong>總金額：</strong>${amountText ? escapeHtml(amountText) : "未設定"}</p>
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
    field("聯繫電話", record.phone),
    field("車牌號碼", record.plate),
    field("車款年份", record.car),
    field("安裝項目", record.items),
    field("主機規格", record.model || record.productSpec),
    field("總金額", amountText),
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

async function loadUpdateManifest(force = false) {
  if (!updateStatus || !updateList || !updateUrlInput) return;
  const manifestUrl = updateUrlInput.value.trim() || defaultUpdateManifestUrl;
  localStorage.setItem(updateUrlKey, manifestUrl);
  updateStatus.textContent = "正在讀取雲端更新清單...";
  updateList.innerHTML = "";

  try {
    const response = await fetch(`${manifestUrl}${manifestUrl.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest.apps)) throw new Error("雲端更新清單格式不正確");
    const items = manifest.apps;
    currentUpdateManifestUrl = manifestUrl;
    updateStatus.textContent = `已讀取 ${items.length} 個更新項目。更新時間：${manifest.updatedAt || "未標示"}`;
    renderUpdateItems(items);
  } catch (error) {
    if (loadBundledManifest(error)) {
      return;
    }

    if (manifestUrl !== "updates.json") {
      try {
        const fallbackResponse = await fetch(`updates.json?t=${Date.now()}`, { cache: "no-store" });
        if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status}`);
        const fallbackManifest = await fallbackResponse.json();
        const fallbackItems = Array.isArray(fallbackManifest.apps) ? fallbackManifest.apps : [];
        currentUpdateManifestUrl = "updates.json";
        updateStatus.textContent = `雲端清單讀取失敗，已使用 APK 內建清單。項目：${fallbackItems.length}`;
        renderUpdateItems(fallbackItems);
        return;
      } catch (fallbackError) {
        updateStatus.textContent = `雲端與內建清單都讀取失敗：${getErrorMessage(fallbackError)}`;
      }
    } else {
      updateStatus.textContent = `雲端清單讀取失敗：${getErrorMessage(error)}`;
    }
    if (force) renderUpdateItems([]);
  }
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
  document.getElementById(tabId)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    await sendToCloud(getPayload("iphone-warranty", data));
    cloudStatus.textContent = "保固資料已儲存並上傳到申悅 Apps Script。";
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

window.addEventListener("pageshow", checkRemoteContentNow);
window.addEventListener("focus", checkRemoteContentNow);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkRemoteContentNow();
});

migrateLegacyData();
renderRecord();
restoreChecklist();
renderVideos();
syncUpdateUploadFileLabels();
if (updateUrlInput) {
  updateUrlInput.value = getPreferredUpdateManifestUrl();
}
if (location.hash === "#updates") {
  switchTab("updates");
}
checkRemoteContentNow();
cloudStatus.textContent = "已設定申悅雲端網址，可上傳保固資料與更新中心資料。";
