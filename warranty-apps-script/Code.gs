const WARRANTY_SHEET_GID = 1050693661;
const WARRANTY_HEADERS = [
  "上傳時間",
  "車主姓名",
  "聯繫電話",
  "車牌號碼",
  "車款年份",
  "安裝項目",
  "主機規格",
  "安裝日期",
  "保固到期日",
  "總金額",
  "備註",
  "來源",
  "建立時間"
];

function doGet() {
  return jsonOutput({
    ok: true,
    message: "申悅保固資料寫入 API 已啟用",
    sheetGid: WARRANTY_SHEET_GID
  });
}

function doPost(e) {
  try {
    const payload = parsePayload(e);
    if (payload.type !== "iphone-warranty") {
      throw new Error("不支援的保固上傳類型：" + (payload.type || ""));
    }
    return jsonOutput(saveWarrantyRecord(payload));
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

function saveWarrantyRecord(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getWarrantySheet();
    ensureWarrantyHeader(sheet);
    const row = [
      formatTaipeiTime(new Date()),
      payload.owner || "",
      payload.phone || "",
      payload.plate || "",
      payload.car || "",
      payload.items || "",
      payload.model || payload.productSpec || "",
      payload.installDate || "",
      payload.warrantyDate || "",
      normalizeWarrantyAmount(payload.totalAmount),
      payload.note || "",
      payload.app || "申悅助手",
      payload.createdAt || ""
    ];
    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();
    return {
      ok: true,
      message: "保固資料已寫入 Google 試算表",
      sheetGid: WARRANTY_SHEET_GID,
      row: rowNumber,
      warranty: {
        owner: payload.owner || "",
        phone: payload.phone || "",
        plate: payload.plate || "",
        model: payload.model || payload.productSpec || ""
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function getWarrantySheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheets().find(function(item) {
    return item.getSheetId() === WARRANTY_SHEET_GID;
  });
  if (!sheet) {
    throw new Error("找不到指定保固工作表 gid=" + WARRANTY_SHEET_GID);
  }
  return sheet;
}

function ensureWarrantyHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, WARRANTY_HEADERS.length);
  const current = headerRange.getValues()[0].map(function(value) {
    return String(value || "").trim();
  });
  const hasHeader = current.some(function(value) { return value; });
  if (!hasHeader) {
    headerRange.setValues([WARRANTY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  let changed = false;
  for (let index = 0; index < WARRANTY_HEADERS.length; index += 1) {
    if (!current[index]) {
      current[index] = WARRANTY_HEADERS[index];
      changed = true;
    }
  }
  if (changed) {
    headerRange.setValues([current]);
  }
}

function normalizeWarrantyAmount(value) {
  const text = String(value || "").replace(/[^\d.]/g, "").trim();
  return text ? Number(text) : "";
}

function formatTaipeiTime(date) {
  return Utilities.formatDate(date, "Asia/Taipei", "yyyy-MM-dd'T'HH:mm:ssZ")
    .replace(/(\d{2})(\d{2})$/, "$1:$2");
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
