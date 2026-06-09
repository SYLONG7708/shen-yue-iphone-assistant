const WARRANTY_SHEET_GID = 1050693661;
const WARRANTY_HEADERS = [
  "車主姓名",
  "車主電話",
  "車牌號碼",
  "車款年分",
  "主機規格",
  "其他產品類別(自行輸入)",
  "總收款金額",
  "安裝日期",
  "保固到期日",
  "備註",
  "備註",
  "來源",
  "建立時間"
];

const WARRANTY_COLUMN_WIDTHS = [
  145,
  145,
  145,
  210,
  230,
  270,
  135,
  150,
  150,
  320,
  220,
  130,
  190
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
      payload.owner || "",
      payload.phone || "",
      payload.plate || "",
      payload.car || "",
      payload.model || payload.productSpec || "",
      payload.items || "",
      normalizeWarrantyAmount(payload.totalAmount),
      payload.installDate || "",
      payload.warrantyDate || "",
      payload.note || "",
      "",
      payload.app || "申悅助手",
      payload.createdAt || ""
    ];
    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();
    formatWarrantyRow(sheet, rowNumber);
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
  headerRange.setValues([WARRANTY_HEADERS]);
  headerRange
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.getRange(1, 1, 1, 10).setBackground("#d9edf7");
  sheet.getRange(1, 11, 1, 3).setBackground("#ffffff");
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 42);

  for (let index = 0; index < WARRANTY_COLUMN_WIDTHS.length; index += 1) {
    sheet.setColumnWidth(index + 1, WARRANTY_COLUMN_WIDTHS[index]);
  }
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), WARRANTY_HEADERS.length)
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.getRange("G:G").setNumberFormat("#,##0");
  sheet.getRange("H:I").setNumberFormat("yyyy-mm-dd");
  if (sheet.getLastRow() > 1) {
    sheet.setRowHeights(2, sheet.getLastRow() - 1, 58);
    sheet.getRange(2, 1, sheet.getLastRow() - 1, WARRANTY_HEADERS.length)
      .setFontSize(11)
      .setFontWeight("bold")
      .setVerticalAlignment("middle")
      .setWrap(true);
  }
}

function formatWarrantyRow(sheet, rowNumber) {
  sheet.setRowHeight(rowNumber, 58);
  sheet.getRange(rowNumber, 1, 1, WARRANTY_HEADERS.length)
    .setFontSize(11)
    .setFontWeight("bold")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.getRange(rowNumber, 7).setNumberFormat("#,##0");
  sheet.getRange(rowNumber, 8, 1, 2).setNumberFormat("yyyy-mm-dd");
}

function normalizeWarrantyAmount(value) {
  const text = String(value || "").replace(/[^\d.]/g, "").trim();
  return text ? Number(text) : "";
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
