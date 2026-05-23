const recordForm = document.querySelector("[data-record-form]");
const recordCard = document.querySelector("[data-record-card]");
const uploadPreview = document.querySelector("[data-upload-preview]");
const copyWarrantyButton = document.querySelector("[data-copy-warranty]");
const checklist = document.querySelector("[data-checklist]");
const installButton = document.querySelector("[data-install]");
const cloudStatus = document.querySelector("[data-cloud-status]");
const adminPanel = document.querySelector("[data-admin-panel]");
const adminOutput = document.querySelector("[data-admin-output]");
const adminShortcut = document.querySelector("[data-admin-shortcut]");
const videoGrid = document.querySelector("[data-video-grid]");
const videoSearch = document.querySelector("[data-video-search]");
const serviceGrid = document.querySelector("[data-service-grid]");

const storageKey = "shenYueCarRecord";
const checklistKey = "shenYueDeliveryChecklist";
const adminKey = "shenYueAdminSettings";
const uploadQueueKey = "shenYueWarrantyUploadQueue";
const adminPin = "7708";
const legacyCloudEndpoints = [
  "https://script.google.com/macros/s/AKfycbxxtXq2JnoqYHU7rHDo4Ddfe_ZfPzwDolglZsbBmY2j1YUkV1fbqcFv8KhNh-stPL8/exec",
  "https://script.google.com/macros/s/AKfycbycw5jHmS8xD2CRtC5PMcHPJjGoOEe8X4BLqY38V8rUMLFruKRZy2fcHA5NfIrxaouiMQ/exec",
  "https://script.google.com/macros/s/AKfycbyyOGMLIduYImY9Hj7PbKkrhhl76Bx754O5AWvB6V2D81IUyFR8UNGcKA_ngdagPRJg/exec"
];
const defaultCloudEndpoint = "https://script.google.com/macros/s/AKfycbxcIrA3syOcg6qCriinVl5KoUt20EnkOIdrW6kXM1OSM5dFZq1qUISkU8Ke8NJQPWuz/exec";
const oldDefaultContentConfigUrl = "https://shen-yue.com.tw/shen-yue-assistant-content.json";
const defaultContentConfigUrl = "shen-yue-assistant-content.json";
let deferredInstallPrompt = null;
let activeVideoCategory = "all";
let lastRemoteContentCheck = 0;

const warrantyUploadColumns = [
  { key: "uploadTime", label: "上傳時間" },
  { key: "owner", label: "車主姓名" },
  { key: "phone", label: "車主電話" },
  { key: "plate", label: "車牌號碼" },
  { key: "car", label: "車款年分" },
  { key: "model", label: "主機規格" },
  { key: "otherProduct", label: "其他產品類別" },
  { key: "totalAmount", label: "總收款金額" },
  { key: "installDate", label: "安裝日期" },
  { key: "warrantyDate", label: "保固到期日" },
  { key: "note", label: "備註" }
];

const requiredWarrantyFields = [
  { key: "owner", label: "車主姓名" },
  { key: "phone", label: "聯繫電話" },
  { key: "plate", label: "車牌號碼" }
];

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

const videos = [
  { title: "新 UI 介面", category: "介面", url: "https://youtu.be/ir2H40ENsKY?si=B3FHIlE9rz7aLW7m" },
  { title: "環景教學播放清單", category: "設定", url: "https://www.youtube.com/playlist?list=PLOoMP1Ydm1eVVIntvqtHyGJS7ONe7faG5" },
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

function formatDateTime(value) {
  if (!value) return "未設定";
  return new Date(value).toLocaleString("zh-TW", { hour12: false });
}

function getRecord() {
  return JSON.parse(localStorage.getItem(storageKey) || "{}");
}

function getAdminSettings() {
  const saved = JSON.parse(localStorage.getItem(adminKey) || "{}");
  saved.cloudEndpoint = (saved.cloudEndpoint || "").trim();
  if (!saved.cloudEndpoint || legacyCloudEndpoints.includes(saved.cloudEndpoint)) {
    saved.cloudEndpoint = defaultCloudEndpoint;
  }
  if (!saved.contentConfigUrl || saved.contentConfigUrl === oldDefaultContentConfigUrl) {
    saved.contentConfigUrl = defaultContentConfigUrl;
  }
  return {
    cloudEndpoint: defaultCloudEndpoint,
    contentConfigUrl: defaultContentConfigUrl,
    heroTitle: defaultContent.heroTitle,
    shopPhone: "0970-117-708",
    lineId: "@585eeefp",
    ...saved
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    app: "申悅車機助手",
    createdAt: new Date().toISOString(),
    ...data
  };
}

function formatCurrency(value) {
  const number = Number(String(value || "").replaceAll(",", ""));
  if (!Number.isFinite(number) || number <= 0) return value || "";
  return number.toLocaleString("zh-TW");
}

function getFormWarrantyData() {
  return Object.fromEntries(new FormData(recordForm).entries());
}

function getMissingRequiredWarrantyField(data) {
  return requiredWarrantyFields.find((field) => !String(data[field.key] || "").trim());
}

function getWarrantyUploadData(data = getRecord(), uploadTime = "") {
  return {
    uploadTime,
    owner: data.owner || "",
    phone: data.phone || "",
    plate: data.plate || "",
    car: data.car || "",
    model: data.model || data.productSpec || "",
    otherProduct: data.otherProduct || data.customProduct || data.otherInstallProduct || "",
    totalAmount: data.totalAmount || "",
    installDate: data.installDate || "",
    warrantyDate: data.warrantyDate || "",
    note: data.note || ""
  };
}

function renderUploadPreview(data = getRecord(), uploadTime = "送出時自動產生") {
  if (!uploadPreview) return;
  const uploadData = getWarrantyUploadData(data, uploadTime);
  uploadPreview.innerHTML = `
    <table>
      <thead>
        <tr>${warrantyUploadColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        <tr>
          ${warrantyUploadColumns.map((column) => {
            const value = column.key === "totalAmount"
              ? formatCurrency(uploadData[column.key])
              : uploadData[column.key];
            return `<td>${escapeHtml(value || "未填寫")}</td>`;
          }).join("")}
        </tr>
      </tbody>
    </table>
  `;
}

function getWarrantyCopyText(data = getFormWarrantyData()) {
  const rows = [
    ["車主姓名", data.owner],
    ["車主電話", data.phone],
    ["車牌號碼", data.plate],
    ["車款年分", data.car],
    ["主機規格", data.model || data.productSpec],
    ["其他產品類別", data.otherProduct || data.customProduct || data.otherInstallProduct],
    ["總收款金額", data.totalAmount ? `$${formatCurrency(data.totalAmount)}` : ""],
    ["安裝日期", data.installDate ? formatDate(data.installDate) : ""],
    ["保固到期日", data.warrantyDate ? formatDate(data.warrantyDate) : ""],
    ["備註", data.note]
  ];

  return [
    "申悅保固資訊",
    ...rows
      .map(([label, value]) => [label, String(value || "").trim()])
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}：${value}`)
  ].join("\n");
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  textarea.style.left = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("裝置未允許複製到剪貼簿");
}

async function copyWarrantyInfo() {
  const data = getFormWarrantyData();
  const missing = getMissingRequiredWarrantyField(data);
  if (missing) {
    const input = recordForm.elements[missing.key];
    if (input) input.focus();
    recordForm.reportValidity();
    cloudStatus.textContent = `請先填寫${missing.label}後再複製保固資訊。`;
    return;
  }

  const text = getWarrantyCopyText(data);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyText(text);
    }
    cloudStatus.textContent = "保固資訊已複製，可貼到其他頁面或 App。";
  } catch (error) {
    cloudStatus.textContent = `複製失敗：${error.message}`;
  }
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

function getUploadQueue() {
  return JSON.parse(localStorage.getItem(uploadQueueKey) || "[]");
}

function saveUploadQueue(queue) {
  localStorage.setItem(uploadQueueKey, JSON.stringify(queue));
}

function queueWarrantyUpload(payload) {
  const queue = getUploadQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    queuedAt: new Date().toISOString(),
    payload
  });
  saveUploadQueue(queue);
}

async function flushWarrantyUploadQueue(showMessage = false) {
  const queue = getUploadQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await sendToCloud(item.payload);
    } catch (error) {
      remaining.push(item);
    }
  }

  saveUploadQueue(remaining);
  if (showMessage) {
    cloudStatus.textContent = remaining.length
      ? `仍有 ${remaining.length} 筆保固資料待網路恢復後自動補傳。`
      : "待補傳保固資料已全部上傳到雲端。";
  }
}

async function saveAndAutoUploadWarranty(data, statusPrefix = "保固資料已儲存") {
  localStorage.setItem(storageKey, JSON.stringify(data));
  renderRecord();
  const uploadTime = new Date().toISOString();
  const payload = getPayload("warranty", {
    ...data,
    uploadTime,
    spreadsheetRow: getWarrantyUploadData(data, uploadTime)
  });
  renderUploadPreview(data, formatDateTime(uploadTime));
  cloudStatus.textContent = `${statusPrefix}，正在自動上傳雲端...`;

  try {
    await sendToCloud(payload);
    cloudStatus.textContent = `${statusPrefix}，並已自動上傳到申悅雲端。`;
    await flushWarrantyUploadQueue();
    return true;
  } catch (error) {
    queueWarrantyUpload(payload);
    cloudStatus.textContent = `${statusPrefix}，但目前上傳失敗，已暫存並會自動補傳：${error.message}`;
    return false;
  }
}

function renderRecord() {
  const record = getRecord();
  if (!Object.keys(record).length) {
    renderUploadPreview();
    return;
  }

  recordCard.innerHTML = `
    <h3>${record.owner || "姓名未設定"}</h3>
    <p><strong>聯繫電話：</strong>${record.phone || "未設定"}</p>
    <p><strong>車牌號碼：</strong>${record.plate || "未設定"}</p>
    <p><strong>車款(年分)：</strong>${record.car || "未設定"}</p>
    <p><strong>主機規格：</strong>${record.model || record.productSpec || "未設定"}</p>
    <p><strong>其他產品類別：</strong>${record.otherProduct || record.customProduct || record.otherInstallProduct || "未設定"}</p>
    <p><strong>總收款金額：</strong>${record.totalAmount ? `$${formatCurrency(record.totalAmount)}` : "未設定"}</p>
    <p><strong>安裝日期：</strong>${record.installDate ? formatDate(record.installDate) : "未設定"}</p>
    <p><strong>保固到期日：</strong>${record.warrantyDate ? formatDate(record.warrantyDate) : "未設定"}</p>
    <p><strong>備註：</strong>${record.note || "未設定"}</p>
  `;

  for (const [key, value] of Object.entries(record)) {
    const input = recordForm.elements[key];
    if (input) input.value = value;
  }
  renderUploadPreview(record);
}

function resetWarrantyView() {
  recordForm.reset();
  recordCard.innerHTML = `
    <h3>目前沒有儲存紀錄</h3>
    <p>輸入後會保存在目前裝置，並自動上傳到申悅雲端。</p>
  `;
  renderUploadPreview();
}

function clearWarrantyInfo() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(uploadQueueKey);
  resetWarrantyView();
  cloudStatus.textContent = "本機保固資料與待補傳資料已清除。雲端試算表既有資料不會被刪除。";
}

function youtubeId(url) {
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  const normalMatch = url.match(/[?&]v=([^?&]+)/);
  return normalMatch ? normalMatch[1] : "";
}

function thumbUrl(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "hero-car-audio.png";
}

function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function renderVideos() {
  const query = normalizeText(videoSearch.value || "");
  const filtered = videos.filter((video) => {
    const inCategory = activeVideoCategory === "all" || video.category === activeVideoCategory;
    const inQuery = normalizeText(`${video.title} ${video.category}`).includes(query);
    return inCategory && inQuery;
  });

  videoGrid.innerHTML = filtered.map((video) => `
    <article class="video-card">
      <a class="video-thumb" href="${video.url}" target="_blank" rel="noopener">
        <img src="${thumbUrl(video.url)}" alt="${video.title}" loading="lazy">
        <span>播放</span>
      </a>
      <div class="video-body">
        <h3>${video.title}</h3>
        <p>${video.category}</p>
        <a href="${video.url}" target="_blank" rel="noopener">開啟教學</a>
      </div>
    </article>
  `).join("");
}

function switchTab(tabId) {
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === tabId);
  });
  document.querySelector(".tab-bar").scrollIntoView({ behavior: "smooth", block: "start" });
}

function restoreChecklist() {
  const saved = JSON.parse(localStorage.getItem(checklistKey) || "[]");
  checklist.querySelectorAll("input").forEach((input, index) => {
    input.checked = Boolean(saved[index]);
  });
}

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = getFormWarrantyData();
  await saveAndAutoUploadWarranty(data);
});

recordForm.addEventListener("input", () => {
  renderUploadPreview(getFormWarrantyData());
});

copyWarrantyButton.addEventListener("click", copyWarrantyInfo);

document.querySelector("[data-clear-warranty]").addEventListener("click", clearWarrantyInfo);

document.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-tab-target]");
  if (tabButton) {
    switchTab(tabButton.dataset.tabTarget);
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

videoSearch.addEventListener("input", renderVideos);

checklist.addEventListener("change", () => {
  const values = [...checklist.querySelectorAll("input")].map((input) => input.checked);
  localStorage.setItem(checklistKey, JSON.stringify(values));
});

document.querySelector("[data-reset-checklist]").addEventListener("click", () => {
  localStorage.removeItem(checklistKey);
  restoreChecklist();
});

adminShortcut.addEventListener("click", () => {
  switchTab("admin");
  const input = document.querySelector("[data-admin-pin]");
  input.focus();
});

document.querySelector("[data-admin-login]").addEventListener("click", () => {
  const input = document.querySelector("[data-admin-pin]");
  if (input.value !== adminPin) {
    input.value = "";
    input.placeholder = "PIN 錯誤";
    return;
  }

  adminPanel.hidden = false;
  const settings = getAdminSettings();
  const form = document.querySelector("[data-admin-form]");
  form.elements.cloudEndpoint.value = settings.cloudEndpoint || "";
  form.elements.contentConfigUrl.value = settings.contentConfigUrl || "";
  form.elements.heroTitle.value = settings.heroTitle || defaultContent.heroTitle;
  form.elements.shopPhone.value = settings.shopPhone || "0970-117-708";
  form.elements.lineId.value = settings.lineId || "7708LUNG";
  adminOutput.textContent = "管理模式已開啟。\n可設定雲端網址、測試連線、匯出本機資料。";
});

document.querySelector("[data-admin-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  data.cloudEndpoint = (data.cloudEndpoint || "").trim();
  data.contentConfigUrl = (data.contentConfigUrl || "").trim();
  localStorage.setItem(adminKey, JSON.stringify(data));
  applyContent({ heroTitle: data.heroTitle });
  adminOutput.textContent = `已儲存管理設定：\n${JSON.stringify(data, null, 2)}`;
  cloudStatus.textContent = "已設定雲端網址，保固資料會自動上傳。";
});

document.querySelector("[data-load-content]").addEventListener("click", () => {
  loadRemoteContent(true);
});

document.querySelector("[data-test-cloud]").addEventListener("click", async () => {
  try {
    await sendToCloud(getPayload("test", { message: "申悅車機助手雲端測試" }));
    adminOutput.textContent = "測試資料已送出。請到 Google 試算表確認。";
  } catch (error) {
    adminOutput.textContent = `測試失敗：${error.message}`;
  }
});

document.querySelector("[data-export-data]").addEventListener("click", () => {
  const data = {
    warranty: getRecord(),
    admin: getAdminSettings(),
    checklist: JSON.parse(localStorage.getItem(checklistKey) || "[]")
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
window.addEventListener("online", () => flushWarrantyUploadQueue(true));
window.addEventListener("pageshow", () => flushWarrantyUploadQueue());
window.addEventListener("focus", () => flushWarrantyUploadQueue());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkRemoteContentNow();
});

renderRecord();
restoreChecklist();
renderVideos();
checkRemoteContentNow();
cloudStatus.textContent = "已設定申悅雲端網址，保固資料會自動上傳。";
