import xlsx from 'xlsx';
import {
  normalizeSeederOwnerName,
  normalizeSeederPan,
  normalizeSeederText,
  normalizeSeederTruckNumber
} from '../helpers/masterSeederNormalization.js';

const LOAD_HEADER_ALIASES = {
  truckNumber: ['truck no', 'truck number', 'vehicle no', 'vehicle number'],
  ownerName: ['truck owner name', 'owner name', 'truck owner', 'transport owner'],
  ownerPan: ['pan no', 'pan number', 'owner pan', 'pan']
};

function normalizeHeader(value) {
  return normalizeSeederText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findHeaderIndex(rows, aliasesByField, limit = 25) {
  for (let index = 0; index < Math.min(rows.length, limit); index += 1) {
    const headers = rows[index].map(normalizeHeader);
    const matches = Object.values(aliasesByField).reduce((count, aliases) => {
      return count + (headers.some((header) => aliases.includes(header)) ? 1 : 0);
    }, 0);

    if (matches >= 2) return index;
  }

  return -1;
}

function mapColumns(headerRow, aliasesByField) {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const columns = {};

  Object.entries(aliasesByField).forEach(([field, aliases]) => {
    const columnIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (columnIndex >= 0) columns[field] = columnIndex;
  });

  return columns;
}

function buildRawRow(headerRow, row) {
  return headerRow.reduce((raw, header, index) => {
    const key = normalizeSeederText(header) || `Column ${index + 1}`;
    raw[key] = row[index] ?? '';
    return raw;
  }, {});
}

function parseLoadSheetRows(sheetRows, sheetName, fileName) {
  const headerIndex = findHeaderIndex(sheetRows, LOAD_HEADER_ALIASES);
  if (headerIndex < 0) {
    return {
      rows: [],
      sheetSummary: {
        sheetName,
        fileName,
        parserType: 'load-details',
        status: 'skipped',
        reason: 'No truck/owner headers found'
      }
    };
  }

  const headerRow = sheetRows[headerIndex];
  const columns = mapColumns(headerRow, LOAD_HEADER_ALIASES);
  const dataRows = sheetRows.slice(headerIndex + 1);
  const rows = [];

  dataRows.forEach((row, offset) => {
    if (!row.some((cell) => normalizeSeederText(cell))) return;

    const truckNumber = normalizeSeederTruckNumber(row[columns.truckNumber]);
    const ownerName = normalizeSeederOwnerName(row[columns.ownerName]);
    const ownerPan = normalizeSeederPan(row[columns.ownerPan]);

    rows.push({
      sourceFileName: fileName,
      sourceSheetName: sheetName,
      sourceRowNumber: headerIndex + offset + 2,
      sourceType: 'load',
      truckNumber,
      ownerName,
      ownerPan,
      rawRow: buildRawRow(headerRow, row)
    });
  });

  return {
    rows,
    sheetSummary: {
      sheetName,
      fileName,
      parserType: 'load-details',
      status: 'parsed',
      headerRowNumber: headerIndex + 1,
      parsedRows: rows.length,
      detectedColumns: Object.keys(columns)
    }
  };
}

function extractOwnerName(row) {
  const sourceCell = row.find((cell) => /truck owner name\s*:/i.test(normalizeSeederText(cell)));
  if (!sourceCell) return '';

  const match = normalizeSeederText(sourceCell).match(/truck owner name\s*:\s*(.+)$/i);
  if (!match) return '';
  return normalizeSeederOwnerName(match[1]);
}

function extractOwnerPan(row) {
  const sourceCell = row.find((cell) => /pan no\s*:/i.test(normalizeSeederText(cell)));
  if (!sourceCell) return '';

  const match = normalizeSeederText(sourceCell).match(/pan no\s*:\s*([a-z0-9]+)/i);
  if (!match) return '';
  return normalizeSeederPan(match[1]);
}

function parsePaymentSheetRows(sheetRows, sheetName, fileName) {
  let currentOwnerName = '';
  let currentOwnerPan = '';
  let tableHeaderRow = -1;
  const rows = [];

  sheetRows.forEach((row, index) => {
    const ownerName = extractOwnerName(row);
    if (ownerName) currentOwnerName = ownerName;

    const ownerPan = extractOwnerPan(row);
    if (ownerPan) currentOwnerPan = ownerPan;

    const isTableHeader = normalizeSeederText(row[0]).toLowerCase() === 'sl' && normalizeSeederText(row[2]).toLowerCase() === 'truck no';
    if (isTableHeader) {
      tableHeaderRow = index;
      return;
    }

    if (tableHeaderRow < 0 || index <= tableHeaderRow) return;

    const truckNumber = normalizeSeederTruckNumber(row[2]);
    const hasData = row.some((cell) => normalizeSeederText(cell));
    const serial = Number(row[0]);

    if (!hasData || !Number.isFinite(serial) || !truckNumber) return;

    rows.push({
      sourceFileName: fileName,
      sourceSheetName: sheetName,
      sourceRowNumber: index + 1,
      sourceType: 'payment',
      truckNumber,
      ownerName: currentOwnerName,
      ownerPan: currentOwnerPan,
      rawRow: row.reduce((raw, cell, cellIndex) => {
        raw[`Column ${cellIndex + 1}`] = cell ?? '';
        return raw;
      }, {})
    });
  });

  return {
    rows,
    sheetSummary: {
      sheetName,
      fileName,
      parserType: 'payment-sheet',
      status: rows.length ? 'parsed' : 'skipped',
      parsedRows: rows.length,
      currentOwnerName,
      currentOwnerPan
    }
  };
}

export function parseTrustedSeederWorkbook(buffer, fileName) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  const rows = [];
  const sheetSummaries = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const sheetRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const loadParse = parseLoadSheetRows(sheetRows, sheetName, fileName);

    if (loadParse.rows.length) {
      rows.push(...loadParse.rows);
      sheetSummaries.push(loadParse.sheetSummary);
      return;
    }

    const paymentParse = parsePaymentSheetRows(sheetRows, sheetName, fileName);
    rows.push(...paymentParse.rows);
    sheetSummaries.push(paymentParse.sheetSummary);
  });

  return {
    rows,
    sheetSummaries,
    workbookSheetCount: workbook.SheetNames.length
  };
}