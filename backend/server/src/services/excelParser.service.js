import xlsx from 'xlsx';
import { normalizePan, normalizeText, normalizeTruckNumber } from '../helpers/normalize.js';

export const MASTER_UPLOAD_FIELDS = [
  { key: 'invNo', header: 'INV NO.', aliases: ['inv no', 'invoice no', 'invoice number'], type: 'text' },
  { key: 'invDate', header: 'INV DATE.', aliases: ['inv date', 'invoice date'], type: 'date' },
  { key: 'grRrNo', header: 'GR/RR NO.', aliases: ['gr rr no', 'grrr no', 'gr no', 'rr no'], type: 'text' },
  { key: 'diNo', header: 'DI NO.', aliases: ['di no', 'di number'], type: 'text' },
  { key: 'partyName', header: "DEPOT/PARTY'S NAME", aliases: ['depot party s name', 'depot party name', 'party name', 'depot name'], type: 'text' },
  { key: 'destination', header: 'DESTINATION', aliases: ['destination'], type: 'text' },
  { key: 'productName', header: 'PODUCT NAME', aliases: ['poduct name', 'product name'], type: 'text' },
  { key: 'truckNo', header: 'TRUCK NO.', aliases: ['truck no', 'truck number', 'vehicle no', 'vehicle number'], type: 'truck' },
  { key: 'truckOwnerName', header: 'TRUCK OWNER NAME', aliases: ['truck owner name', 'owner name', 'truck owner'], type: 'text' },
  { key: 'panNo', header: 'PAN NO', aliases: ['pan no', 'pan number', 'owner pan', 'pan'], type: 'pan' },
  { key: 'qty', header: 'QTY', aliases: ['qty', 'quantity'], type: 'number' },
  { key: 'frtPmt', header: 'FRT-PMT', aliases: ['frt pmt', 'freight rate', 'rate'], type: 'number' },
  { key: 'frtAmt', header: 'FRT AMT', aliases: ['frt amt', 'freight amount', 'amount'], type: 'number' },
  { key: 'billNo', header: 'BILL NO', aliases: ['bill no', 'bill number'], type: 'text' },
  { key: 'billDate', header: 'BILL DATE', aliases: ['bill date'], type: 'date' },
  { key: 'rfidTag', header: 'RFID TAG', aliases: ['rfid tag', 'rfid'], type: 'number' },
  { key: 'gpsInstall', header: 'GPS INSTALL', aliases: ['gps install', 'gps'], type: 'number' },
  { key: 'dieselLtr', header: 'LESS: DIESEL(Ltr)', aliases: ['less diesel ltr', 'diesel ltr', 'diesel'], type: 'number' },
  { key: 'dieselAmount', header: 'DIESEL AMOUNT', aliases: ['diesel amount'], type: 'dieselAmount' },
  { key: 'lessAdvance', header: 'LESS: ADVANCE', aliases: ['less advance', 'lessAdvance'], type: 'number' },
  { key: 'urea', header: 'UREA', aliases: ['urea'], type: 'number' },
  { key: 'bagShortage', header: 'BAG SHORTAGE', aliases: ['bag shortage'], type: 'number' }
];

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && normalizeText(value) === '');
}

function parseMaybeNumber(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAdditiveAmount(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = String(value).replace(/,/g, '').trim();
  if (/^\d+(\.\d+)?(\s*\+\s*\d+(\.\d+)?)*$/.test(text)) {
    return text.split('+').reduce((total, part) => total + Number(part.trim()), 0);
  }

  return parseMaybeNumber(value);
}

function parseExcelDate(value) {
  if (isBlank(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function findHeaderRow(rows) {
  let best = { index: -1, score: 0 };

  rows.slice(0, 25).forEach((row, index) => {
    const normalizedCells = row.map(normalizeHeader);
    const score = MASTER_UPLOAD_FIELDS.reduce((total, field) => {
      const candidates = [field.header, ...field.aliases].map(normalizeHeader);
      return total + (normalizedCells.some((cell) => candidates.includes(cell)) ? 1 : 0);
    }, 0);

    if (score > best.score) best = { index, score };
  });

  return best.score >= 6 ? best.index : -1;
}

function mapColumns(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const mapped = {};

  MASTER_UPLOAD_FIELDS.forEach((field) => {
    const candidates = [field.header, ...field.aliases].map(normalizeHeader);
    const index = normalizedHeaders.findIndex((header) => candidates.includes(header));
    if (index >= 0) mapped[field.key] = index;
  });

  return mapped;
}

function buildRawRow(headerRow, row) {
  const raw = headerRow.reduce((current, header, index) => {
    const key = normalizeText(header) || `Column ${index + 1}`;
    current[key] = row[index] ?? null;
    return current;
  }, {});

  MASTER_UPLOAD_FIELDS.forEach((field) => {
    if (!(field.header in raw)) raw[field.header] = null;
  });

  return raw;
}

function normalizedRowValue(field, value) {
  if (isBlank(value)) return null;

  switch (field.type) {
    case 'truck':
      return normalizeTruckNumber(value);
    case 'pan':
      return normalizePan(value);
    case 'number':
      return parseMaybeNumber(value);
    case 'dieselAmount':
      return parseAdditiveAmount(value);
    case 'date':
      return parseExcelDate(value);
    default:
      return normalizeText(value);
  }
}

function buildNormalizedFields(row, columns) {
  const normalizedFields = {};

  MASTER_UPLOAD_FIELDS.forEach((field) => {
    const value = columns[field.key] >= 0 ? row[columns[field.key]] : null;
    normalizedFields[field.key] = normalizedRowValue(field, value);
  });

  normalizedFields.normalizedTruckNo = normalizedFields.truckNo || null;
  normalizedFields.normalizedOwnerName = normalizedFields.truckOwnerName ? normalizeText(normalizedFields.truckOwnerName).toUpperCase() : null;
  normalizedFields.ownerPan = normalizedFields.panNo;
  normalizedFields.normalizedOwnerPan = normalizedFields.panNo ? normalizePan(normalizedFields.panNo) : null;
  normalizedFields.dieselAmountRaw = columns.dieselAmount >= 0 ? row[columns.dieselAmount] ?? null : null;
  normalizedFields.rfid = normalizedFields.rfidTag;
  normalizedFields.gps = normalizedFields.gpsInstall;
  normalizedFields.rfidGps = (normalizedFields.rfid || 0) + (normalizedFields.gps || 0);

  return normalizedFields;
}

function buildLegacyRowShape(normalizedFields) {
  return {
    truckNo: normalizedFields.normalizedTruckNo || null,
    ownerName: normalizedFields.truckOwnerName || null,
    ownerPan: normalizedFields.panNo || null,
    gstNo: null,
    mobileNo: null,
    address: null,
    gstRate: null
  };
}

export function parseMasterWorkbook(buffer, options = {}) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  const rows = [];
  const sheetSummaries = [];
  const sourceFileName = options.fileName || options.sourceFileName || '';

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const sheetRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
    const headerIndex = findHeaderRow(sheetRows);

    if (headerIndex < 0) {
      sheetSummaries.push({ sheetName, status: 'skipped', reason: 'No recognizable master upload headers found' });
      return;
    }

    const headerRow = sheetRows[headerIndex];
    const columns = mapColumns(headerRow);
    const dataRows = sheetRows.slice(headerIndex + 1);
    let parsedRows = 0;

    dataRows.forEach((row, rowOffset) => {
      const hasAnyValue = row.some((value) => !isBlank(value));
      if (!hasAnyValue) return;

      parsedRows += 1;
      const rawRow = buildRawRow(headerRow, row);
      const normalizedFields = buildNormalizedFields(row, columns);

      rows.push({
        rowNumber: headerIndex + rowOffset + 2,
        sheetName,
        sourceFileName,
        rawRow,
        normalizedFields,
        normalizedRow: normalizedFields,
        truckNo: normalizedFields.normalizedTruckNo || null,
        ownerName: normalizedFields.truckOwnerName || null,
        ownerPan: normalizedFields.panNo || null,
        gstNo: null,
        mobileNo: null,
        address: null,
        gstRate: options.gstRate ?? null,
        ...buildLegacyRowShape(normalizedFields)
      });
    });

    sheetSummaries.push({
      sheetName,
      status: 'parsed',
      headerRowNumber: headerIndex + 1,
      parsedRows,
      detectedColumns: Object.keys(columns)
    });
  });

  return {
    rows,
    sheetSummaries,
    sheets: sheetSummaries,
    workbookSheetCount: workbook.SheetNames.length
  };
}

export const parseLoadWorkbook = parseMasterWorkbook;
export { parseAdditiveAmount };
