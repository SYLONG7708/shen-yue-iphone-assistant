const form = document.querySelector("[data-upload-form]");
const targetSelect = document.querySelector("[data-target-select]");
const apkFileInput = document.querySelector("[data-apk-file]");
const dropZone = document.querySelector("[data-drop-zone]");
const dropTitle = document.querySelector("[data-drop-title]");
const fileMeta = document.querySelector("[data-file-meta]");
const statusBox = document.querySelector("[data-connection-status]");
const progressBar = document.querySelector("[data-progress-bar]");
const resultOutput = document.querySelector("[data-result-output]");
const appList = document.querySelector("[data-app-list]");
const healthList = document.querySelector("[data-health-list]");
const replaceField = document.querySelector("[data-replace-field]");
const newAppFields = document.querySelector("[data-new-app-fields]");
const modeCards = Array.from(document.querySelectorAll(".mode-card"));

const settingsKey = "shenYuePublicUploaderSettings";
let currentItems = [];

function getQuery() {
  const query = new URLSearchParams(location.search);
  if (location.hash && location.hash.includes("=")) {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    hash.forEach((value, key) => query.set(key, value));
  }
  return query;
}

function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(settingsKey) || "{}");
  } catch {
    saved = {};
  }
  const query = getQuery();
  const apiBase = query.get("api") || saved.apiBase || "";
  const uploadKey = query.get("key") || query.get("k") || saved.uploadKey || "";
  const uploadMode = query.get("mode") || saved.uploadMode || "replace";
  form.elements.apiBase.value = apiBase;
  form.elements.uploadKey.value = uploadKey;
  form.elements.uploadMode.value = uploadMode === "create" ? "create" : "replace";
}

function saveSettings() {
  const data = {
    apiBase: normalizeApiBase(form.elements.apiBase.value),
    uploadKey: form.elements.uploadKey.value.trim(),
    uploadMode: getUploadMode()
  };
  localStorage.setItem(settingsKey, JSON.stringify(data));
  return data;
}

function getUploadMode() {
  return form.elements.uploadMode.value === "create" ? "create" : "replace";
}

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function apiUrl(path, params = {}) {
  const base = normalizeApiBase(form.elements.apiBase.value);
  if (!base) throw new Error("尚未設定上傳服務網址。");
  const url = new URL(path, `${base}/`);
  const key = form.elements.uploadKey.value.trim();
  if (key) url.searchParams.set("key", key);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      url.searchParams.set(name, value);
    }
  });
  return url.toString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSize(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "未標示";
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function getAssetNameFromUrl(value) {
  const clean = String(value || "").split("?")[0].split("#")[0];
  const raw = clean.split("/").filter(Boolean).pop() || "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function resolveAssetUrl(value, fallback = "../assets/app-logo.png") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  if (/^(https?:|data:|blob:|file:)/i.test(text)) return text;
  return new URL(text.replace(/^\/+/, "").startsWith("assets/") ? `../${text}` : text, location.href).href;
}

function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status-strip ${type}`.trim();
}

function setProgress(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  progressBar.style.setProperty("--progress", `${safe}%`);
}

function writeResult(data) {
  resultOutput.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function updateModeUi() {
  const mode = getUploadMode();
  const isCreate = mode === "create";
  replaceField.hidden = isCreate;
  newAppFields.hidden = !isCreate;
  targetSelect.disabled = isCreate;
  dropTitle.textContent = isCreate ? "選擇 APK 並立即新增" : "選擇 APK 並立即替換";
  fileMeta.textContent = isCreate
    ? "支援拖放 APK；選定後自動建立新項目。"
    : "支援拖放 APK；選定後自動開始上傳。";
  modeCards.forEach((card) => {
    const input = card.querySelector("input");
    card.classList.toggle("is-selected", input?.checked);
  });
}

function renderHealth(status) {
  const rows = [
    ["Release", status.releaseTag ? `${status.githubRepo} / ${status.releaseTag}` : "待檢查"],
    ["Manifest", status.manifestUpdatedAt ? `${status.appsCount} 筆，${status.manifestUpdatedAt}` : "待檢查"],
    ["Apps Script", status.appsScriptEndpoint ? "已設定同步端點" : "未設定"]
  ];
  healthList.innerHTML = rows.map(([label, value]) => `
    <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
  `).join("");
}

function renderApps(items) {
  currentItems = Array.isArray(items) ? items : [];
  targetSelect.innerHTML = '<option value="">自動依 APK 套件判斷</option>' + currentItems.map((item) => {
    const asset = getAssetNameFromUrl(item.apkUrl);
    return `<option value="${escapeHtml(item.id || item.packageName || asset)}" data-asset="${escapeHtml(asset)}">${escapeHtml(item.name || item.packageName || asset)}｜${escapeHtml(item.versionName || "未標示")}</option>`;
  }).join("");

  appList.innerHTML = currentItems.map((item) => {
    const asset = getAssetNameFromUrl(item.apkUrl);
    return `
      <article class="app-item">
        <img src="${escapeHtml(resolveAssetUrl(item.iconUrl || item.imageUrl))}" alt="" onerror="this.src='../assets/app-logo.png'">
        <div>
          <strong>${escapeHtml(item.name || asset || "未命名")}</strong>
          <span>${escapeHtml(asset || item.packageName || "未設定檔名")}</span>
        </div>
      </article>
    `;
  }).join("") || '<p class="status-strip">目前清單沒有項目。</p>';
}

async function loadStatus() {
  saveSettings();
  setStatus("正在連線上傳服務...");
  try {
    const response = await fetch(apiUrl("api/status"), { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.message || `HTTP ${response.status}`);
    renderApps(data.apps || []);
    renderHealth(data);
    setStatus(`已連線：目前 ${data.appsCount || 0} 個更新項目`, "ok");
    writeResult({
      ok: true,
      message: "上傳服務可用",
      uploaderUrl: normalizeApiBase(form.elements.apiBase.value),
      apps: data.appsCount || 0
    });
  } catch (error) {
    setStatus(`連線失敗：${error.message || error}`, "error");
    writeResult("請確認上傳服務已啟動，或檢查網址與 URL 密鑰。");
  }
}

function updateAssetFromSelection() {
  const selected = targetSelect.selectedOptions[0];
  const asset = selected?.dataset?.asset || "";
  if (asset && !form.elements.assetName.value.trim()) {
    form.elements.assetName.value = asset;
  }
}

function validateFile(file) {
  if (!file) throw new Error("沒有選擇 APK 檔案。");
  if (!/\.apk$/i.test(file.name)) throw new Error("請選擇 .apk 檔。");
}

function getUploadParams() {
  const mode = getUploadMode();
  const params = {
    mode,
    assetName: form.elements.assetName.value.trim()
  };

  if (mode === "replace") {
    params.itemId = form.elements.itemId.value.trim();
    return params;
  }

  params.appName = form.elements.appName.value.trim();
  params.category = form.elements.category.value.trim();
  params.description = form.elements.description.value.trim();
  params.iconUrl = form.elements.iconUrl.value.trim();
  params.imageUrl = form.elements.imageUrl.value.trim();
  params.changelog = form.elements.changelog.value.trim();
  return params;
}

function uploadFile(file) {
  validateFile(file);
  const settings = saveSettings();
  if (!settings.apiBase) throw new Error("尚未設定上傳服務網址。");

  const params = getUploadParams();
  const isCreate = params.mode === "create";
  const targetLabel = isCreate ? (params.appName || "新增 APK") : (targetSelect.selectedOptions[0]?.textContent || "自動比對");
  fileMeta.textContent = `${file.name} / ${formatSize(file.size)} / ${targetLabel}`;
  setProgress(0);
  setStatus(isCreate ? "正在新增 APK，請不要關閉頁面。" : "正在上傳 APK，請不要關閉頁面。");
  writeResult("上傳中...");

  const xhr = new XMLHttpRequest();
  xhr.open("PUT", apiUrl("api/upload", params));
  xhr.setRequestHeader("Content-Type", "application/vnd.android.package-archive");
  if (settings.uploadKey) xhr.setRequestHeader("X-Upload-Token", settings.uploadKey);
  xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      setProgress((event.loaded / event.total) * 92);
    }
  };

  xhr.onload = () => {
    let data = {};
    try {
      data = JSON.parse(xhr.responseText || "{}");
    } catch {
      data = { ok: false, message: xhr.responseText || "上傳服務回應格式錯誤" };
    }
    if (xhr.status < 200 || xhr.status >= 300 || data.ok === false) {
      setStatus(`上傳失敗：${data.message || `HTTP ${xhr.status}`}`, "error");
      writeResult(data);
      setProgress(0);
      return;
    }
    setProgress(100);
    setStatus(`已完成：${data.item?.name || file.name} 已${data.operation === "create" ? "新增" : "替換"}`, "ok");
    writeResult(data);
    loadStatus();
  };

  xhr.onerror = () => {
    setStatus("上傳失敗：網路連線中斷。", "error");
    writeResult("上傳服務沒有回應。");
    setProgress(0);
  };

  xhr.send(file);
}

function handleFiles(files) {
  const file = files && files[0];
  try {
    uploadFile(file);
  } catch (error) {
    setStatus(`無法上傳：${error.message || error}`, "error");
    writeResult(error.message || String(error));
    setProgress(0);
  }
}

loadSettings();
updateModeUi();

form.elements.apiBase.addEventListener("change", loadStatus);
form.elements.uploadKey.addEventListener("change", loadStatus);
Array.from(form.elements.uploadMode).forEach((input) => {
  input.addEventListener("change", () => {
    updateModeUi();
    saveSettings();
  });
});
targetSelect.addEventListener("change", updateAssetFromSelection);
apkFileInput.addEventListener("change", () => handleFiles(apkFileInput.files));

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragover");
  handleFiles(event.dataTransfer.files);
});

if (form.elements.apiBase.value) {
  loadStatus();
} else {
  renderHealth({});
  setStatus("請貼上啟動工具提供的公開上傳網址。");
}
