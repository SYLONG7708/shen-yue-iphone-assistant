const SPREADSHEET_ID = "";
const SHEET_NAME = "保固上傳";

const HEADERS = [
  "上傳時間",
  "車主姓名",
  "車主電話",
  "車牌號碼",
  "車款年分",
  "主機規格",
  "其他產品類別(自行輸入)",
  "總金額",
  "安裝日期",
  "保固到期日",
  "備註"
];

function doGet() {
  return jsonOutput({
    ok: true,
    message: "申悅保固資料上傳 API 已啟用",
    sheet: SHEET_NAME
  });
}

function doPost(e) {
  try {
    const payload = parsePayload(e);
    const sheet = getWarrantySheet();
    ensureSheetLayout(sheet);

    const rowData = buildWarrantyRow(payload);
    sheet.appendRow(rowData);

    const row = sheet.getLastRow();
    formatDataRow(sheet, row);

    return jsonOutput({
      ok: true,
      message: "保固資料已上傳",
      row,
      data: objectFromHeaders(rowData)
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

function getWarrantySheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("找不到試算表，請綁定試算表或填入 SPREADSHEET_ID");
  }

  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureSheetLayout(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsHeader = currentHeaders.join("") === "" || currentHeaders.join("|") !== HEADERS.join("|");

  if (needsHeader) {
    headerRange.setValues([HEADERS]);
  }

  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, HEADERS.length, 190);
  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(5, 230);
  sheet.setColumnWidth(6, 260);
  sheet.setColumnWidth(7, 300);
  sheet.setColumnWidth(8, 180);
  sheet.setColumnWidth(11, 420);
  sheet.setRowHeight(1, 52);

  headerRange
    .setFontWeight("bold")
    .setFontSize(12)
    .setFontColor("#071018")
    .setBackground("#dff6ff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), HEADERS.length)
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
    row.otherProduct || payload.otherProduct || payload.customProduct || payload.otherInstallProduct || "",
    row.totalAmount || payload.totalAmount || "",
    row.installDate || payload.installDate || "",
    row.warrantyDate || payload.warrantyDate || "",
    row.note || payload.note || ""
  ];
}

function formatDataRow(sheet, row) {
  const range = sheet.getRange(row, 1, 1, HEADERS.length);
  range
    .setFontSize(12)
    .setFontColor("#111827")
    .setBackground("#ffffff")
    .setHorizontalAlignment("left")
    .setVerticalAlignment("top")
    .setWrap(true);

  sheet.setRowHeight(row, 86);
  sheet.getRange(row, 8).setNumberFormat("#,##0");
}

function formatUploadTime(date) {
  const timezone = Session.getScriptTimeZone() || "Asia/Taipei";
  return Utilities.formatDate(date, timezone, "yyyy/MM/dd HH:mm:ss");
}

function objectFromHeaders(rowData) {
  return HEADERS.reduce((result, header, index) => {
    result[header] = rowData[index];
    return result;
  }, {});
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
