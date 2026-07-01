import { ImportSession, LoadRow } from '../models/MasterImport.js';
import { MASTER_UPLOAD_FIELDS, parseLoadWorkbook, parseAdditiveAmount } from './excelParser.service.js';
import { normalizeOwnerName, normalizePan, normalizeText, normalizeTruckNumber } from '../helpers/normalize.js';
import { TruckMaster } from '../models/TruckMaster.js';

const EDITABLE_FIELDS = {
  invNo: 'text',
  invDate: 'date',
  grRrNo: 'text',
  diNo: 'text',
  partyName: 'text',
  destination: 'text',
  productName: 'text',
  truckNo: 'truck',
  truckOwnerName: 'text',
  panNo: 'pan',
  qty: 'number',
  frtPmt: 'number',
  frtAmt: 'number',
  billNo: 'text',
  billDate: 'date',
  rfidTag: 'number',
  gpsInstall: 'number',
  lessDieselLtr: 'number',
  dieselAmount: 'diesel',
  lessAdvance: 'number',
  urea: 'number',
  bagShortage: 'number'
};

function parseMaybeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMaybeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeEditedField(key, value) {
  if (value === null || value === undefined || value === '') return null;

  switch (EDITABLE_FIELDS[key]) {
    case 'truck':
      return normalizeTruckNumber(value);
    case 'pan':
      return normalizePan(value);
    case 'number':
      return parseMaybeNumber(value);
    case 'diesel':
      return parseAdditiveAmount(value);
    case 'date':
      return parseMaybeDate(value);
    default:
      return normalizeText(value);
  }
}

async function refreshSessionCounts(sessionId) {
  const rows = await LoadRow.find({ importSessionId: sessionId });
  const counts = rows.reduce(
    (accumulator, row) => {
      accumulator.rowCount += 1;
      const severities = (row.validationMessages || []).reduce(
        (rowCounts, message) => {
          if (message.severity === 'error') rowCounts.errorCount += 1;
          if (message.severity === 'warning') rowCounts.warningCount += 1;
          if (message.severity === 'info') rowCounts.validCount += 1;
          return rowCounts;
        },
        { errorCount: 0, warningCount: 0, validCount: 0 }
      );

      if (severities.errorCount === 0) accumulator.validCount += 1;
      accumulator.warningCount += severities.warningCount;
      accumulator.errorCount += severities.errorCount;
      return accumulator;
    },
    { rowCount: 0, validCount: 0, warningCount: 0, errorCount: 0 }
  );

  const status = counts.errorCount > 0 ? 'previewed' : counts.warningCount > 0 ? 'edited' : 'saved';
  await ImportSession.findByIdAndUpdate(sessionId, { ...counts, status });
  return counts;
}

function countBySeverity(messages) {
  return messages.reduce(
    (counts, item) => {
      if (item.severity === 'error') counts.errorCount += 1;
      if (item.severity === 'warning') counts.warningCount += 1;
      if (item.severity === 'info') counts.infoCount += 1;
      return counts;
    },
    { errorCount: 0, warningCount: 0, infoCount: 0 }
  );
}

function normalizeInvoiceReference(value) {
  return normalizeText(value).trim().toUpperCase();
}

async function attachDuplicateInvoiceValidation(rows) {
  const invoiceNumbers = rows
    .map((row) => normalizeInvoiceReference(row.normalizedRow?.invNo))
    .filter(Boolean);

  if (!invoiceNumbers.length) return rows;

  const existingRows = (await LoadRow.find({ 'normalizedRow.invNo': { $in: invoiceNumbers } })) || [];
  const existingInvoiceNumbers = new Set(
    existingRows
      .map((row) => normalizeInvoiceReference(row?.normalizedRow?.invNo))
      .filter(Boolean)
  );
  const seenInvoiceNumbers = new Set();

  rows.forEach((row) => {
    const invoiceNumber = normalizeInvoiceReference(row.normalizedRow?.invNo);
    if (!invoiceNumber) return;

    const duplicateInvoice = existingInvoiceNumbers.has(invoiceNumber) || seenInvoiceNumbers.has(invoiceNumber);
    if (duplicateInvoice) {
      row.validationMessages = [
        ...(row.validationMessages || []),
        {
          rowNumber: row.rowNumber,
          field: 'invNo',
          severity: 'error',
          message: `Invoice number ${invoiceNumber} already exists in the database and will not be inserted`
        }
      ];
      row.skipInsert = true;
    }

    seenInvoiceNumbers.add(invoiceNumber);
    const counts = countBySeverity(row.validationMessages || []);
    row.errorCount = counts.errorCount;
    row.warningCount = counts.warningCount;
    row.infoCount = counts.infoCount;
  });

  return rows;
}

function hasErrorMessages(messages = []) {
  return messages.some((message) => message.severity === 'error');
}

function clonePreviewRows(rows = []) {
  return rows.map((row) => ({
    ...row,
    validationMessages: [...(row.validationMessages || [])]
  }));
}

function countWarnings(rows = []) {
  return rows.reduce(
    (count, row) => count + (row.validationMessages || []).filter((item) => item.severity === 'warning').length,
    0
  );
}

function getSavedRowCount(rows = []) {
  return rows.filter((row) => !row.skipInsert && !hasErrorMessages(row.validationMessages || [])).length;
}

function requiredFieldWarning(rowNumber, field, message) {
  return { rowNumber, field, severity: 'warning', message };
}

function validateNormalizedRow(normalizedRow, rowNumber, masterMatch, rawRow = {}) {
  const messages = [];

  MASTER_UPLOAD_FIELDS.forEach((field) => {
    const sourceValue = rawRow[field.header];
    if (sourceValue === null || sourceValue === undefined || sourceValue === '') {
      messages.push({ rowNumber, field: field.key, severity: 'warning', message: field.header + ' is blank or missing in source row' });
    }
  });

  if (!normalizedRow.truckNo) messages.push({ rowNumber, field: 'truckNo', severity: 'error', message: 'Truck number is missing' });
  if (!normalizedRow.truckOwnerName) messages.push({ rowNumber, field: 'truckOwnerName', severity: 'error', message: 'Truck owner name is missing' });
  if (!normalizedRow.panNo) messages.push({ rowNumber, field: 'panNo', severity: 'warning', message: 'PAN number is missing' });

  const numericFields = ['qty', 'frtPmt', 'frtAmt', 'rfidTag', 'gpsInstall', 'rfidGps', 'dieselLtr', 'dieselAmount', 'lessAdvance', 'urea', 'bagShortage'];
  numericFields.forEach((field) => {
    if (normalizedRow[field] !== null && normalizedRow[field] !== undefined && !Number.isFinite(normalizedRow[field])) {
      messages.push({ rowNumber, field, severity: 'error', message: `${field} must be numeric` });
    }
  });

  if (Number.isFinite(normalizedRow.qty) && Number.isFinite(normalizedRow.frtPmt) && Number.isFinite(normalizedRow.frtAmt)) {
    const expected = normalizedRow.qty * normalizedRow.frtPmt;
    if (Math.round(expected) !== Math.round(normalizedRow.frtAmt)) {
      messages.push({ rowNumber, field: 'frtAmt', severity: 'warning', message: 'Freight amount does not match Qty x Rate' });
    }
  }

  if (!masterMatch.truckExists) {
    messages.push({ rowNumber, field: 'truckNo', severity: 'error', message: 'Truck number is not found in TruckMaster' });
  }

  if (masterMatch.truckExists && !masterMatch.ownerMatches) {
    messages.push({ rowNumber, field: 'truckOwnerName', severity: 'warning', message: 'Truck owner name does not match seeded owner master data' });
  }

  if (masterMatch.truckExists && !masterMatch.panMatches) {
    messages.push({ rowNumber, field: 'panNo', severity: 'warning', message: 'PAN does not match seeded owner master data' });
  }

  if (normalizedRow.invNo === null || normalizedRow.invNo === undefined || normalizedRow.invNo === '') {
    messages.push(requiredFieldWarning(rowNumber, 'invNo', 'Invoice number is missing'));
  }

  if (normalizedRow.grRrNo === null || normalizedRow.grRrNo === undefined || normalizedRow.grRrNo === '') {
    messages.push(requiredFieldWarning(rowNumber, 'grRrNo', 'GR/RR number is missing'));
  }

  return messages;
}

async function findTruckMatch(truckNo) {
  if (!truckNo) return null;
  return TruckMaster.findOne({ normalizedTruckNumber: normalizeTruckNumber(truckNo) }).populate('ownerId', 'ownerName normalizedOwnerName panNumber');
}

async function compareWithMaster(normalizedRow) {
  const truck = await findTruckMatch(normalizedRow.truckNo);
  if (!truck) {
    return {
      truckExists: false,
      ownerMatches: false,
      panMatches: false,
      truckMaster: null,
      ownerMaster: null
    };
  }

  const ownerMaster = truck.ownerId;
  return {
    truckExists: true,
    ownerMatches: normalizeOwnerName(normalizedRow.truckOwnerName) === normalizeOwnerName(ownerMaster?.ownerName),
    panMatches: normalizePan(normalizedRow.panNo) === normalizePan(ownerMaster?.panNumber),
    truckMaster: truck,
    ownerMaster
  };
}

async function validateRows(rows) {
  const validatedRows = [];
  const messages = [];

  for (const row of rows) {
    const masterMatch = await compareWithMaster(row.normalizedRow);
    const validationMessages = validateNormalizedRow(row.normalizedRow, row.rowNumber, masterMatch, row.rawRow);
    const severityCounts = countBySeverity(validationMessages);

    validatedRows.push({
      ...row,
      validationMessages,
      editStatus: 'unchanged',
      approvalStatus: validationMessages.some((item) => item.severity === 'error') ? 'pending' : 'pending',
      masterMatch,
      ...severityCounts
    });

    messages.push(...validationMessages);
  }

  const rowsWithDuplicateChecks = await attachDuplicateInvoiceValidation(validatedRows);
  const duplicateMessages = rowsWithDuplicateChecks.flatMap((row) => row.validationMessages || []);
  const summary = countBySeverity(duplicateMessages);
  return {
    rows: rowsWithDuplicateChecks,
    messages: duplicateMessages,
    summary,
    status: summary.errorCount > 0 ? 'errors' : summary.warningCount > 0 ? 'warnings' : 'valid'
  };
}

export async function previewLoadImport({
  fileBuffer,
  fileName,
  uploadedBy,
  createdBy,
  updatedBy,
  transportCompanyId,
  clientCompanyId,
  plantId
}) {
  const parsed = parseLoadWorkbook(fileBuffer);
  const validated = await validateRows(parsed.rows);
  const sheetNames = (parsed.sheets || parsed.sheetSummaries || []).map((sheet) => sheet.sheetName);
  const previewSession = {
    fileName,
    uploadedBy,
    createdBy,
    updatedBy,
    transportCompanyId,
    clientCompanyId,
    plantId,
    rowCount: validated.rows.length,
    validCount: getSavedRowCount(validated.rows),
    warningCount: validated.summary.warningCount,
    errorCount: validated.summary.errorCount,
    status: 'previewed',
    sheetNames
  };

  return {
    session: previewSession,
    rows: validated.rows,
    parsed,
    summary: validated.summary,
    status: validated.status,
    messages: validated.messages
  };
}

export async function finalizeImportSession(payload, currentUser) {
  const {
    fileName,
    transportCompanyId,
    clientCompanyId,
    plantId,
    rows = [],
    sheetNames = []
  } = payload || {};

  if (!fileName) {
    const error = new Error('fileName is required');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    const error = new Error('No validated rows available to save');
    error.statusCode = 400;
    throw error;
  }

  const rowsWithDuplicateChecks = await attachDuplicateInvoiceValidation(clonePreviewRows(rows));
  const invalidRows = rowsWithDuplicateChecks.filter((row) => row.skipInsert || hasErrorMessages(row.validationMessages || []));

  if (invalidRows.length > 0) {
    const duplicateInvoices = invalidRows
      .map((row) => normalizeInvoiceReference(row.normalizedRow?.invNo))
      .filter(Boolean);
    const error = new Error(
      duplicateInvoices.length
        ? `Duplicate invoice number(s) found: ${[...new Set(duplicateInvoices)].join(', ')}`
        : 'Validated rows contain errors and cannot be saved'
    );
    error.statusCode = 400;
    error.details = {
      duplicateInvoices: [...new Set(duplicateInvoices)],
      rows: invalidRows
    };
    throw error;
  }

  const saveableRows = rowsWithDuplicateChecks.filter((row) => !row.skipInsert);
  const warningCount = countWarnings(saveableRows);
  const session = await ImportSession.create({
    fileName,
    uploadedBy: currentUser?.id || currentUser?._id,
    createdBy: currentUser?.id || currentUser?._id,
    updatedBy: currentUser?.id || currentUser?._id,
    transportCompanyId,
    clientCompanyId,
    plantId,
    rowCount: saveableRows.length,
    validCount: saveableRows.length,
    warningCount,
    errorCount: 0,
    status: 'saved',
    sheetNames
  });

  const createdRows = await LoadRow.insertMany(
    saveableRows.map((row) => ({
      importSessionId: session._id,
      transportCompanyId: session.transportCompanyId,
      clientCompanyId: session.clientCompanyId,
      plantId: session.plantId,
      sourceSheetName: row.sourceSheetName || row.sheetName || '',
      sourceRowNumber: row.sourceRowNumber ?? row.rowNumber,
      rawRow: row.rawRow,
      normalizedRow: row.normalizedRow,
      validationMessages: row.validationMessages,
      editStatus: row.editStatus,
      approvalStatus: row.approvalStatus,
      createdBy: currentUser?.id || currentUser?._id,
      updatedBy: currentUser?.id || currentUser?._id
    }))
  );

  return {
    session,
    rows: createdRows,
    summary: {
      rowCount: saveableRows.length,
      validCount: saveableRows.length,
      warningCount,
      errorCount: 0
    },
    status: 'saved',
    messages: saveableRows.flatMap((row) => row.validationMessages || [])
  };
}

export async function listImportSessions() {
  return ImportSession.find()
    .populate('transportCompanyId', 'companyName companyCode')
    .populate('clientCompanyId', 'companyName companyCode')
    .populate('plantId', 'plantName plantCode')
    .sort({ createdAt: -1 })
    .limit(50);
}

export async function listImportedData(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 100), 1), 500);
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
  const filter = {};

  if (query.transportCompanyId) filter.transportCompanyId = query.transportCompanyId;
  if (query.clientCompanyId) filter.clientCompanyId = query.clientCompanyId;
  if (query.plantId) filter.plantId = query.plantId;
  if (query.status) filter.approvalStatus = query.status;
  if (query.invoiceNumber) {
    filter['normalizedRow.invNo'] = new RegExp(String(query.invoiceNumber), 'i');
  }
  if (query.truckNumber) {
    filter['normalizedRow.truckNo'] = new RegExp(String(query.truckNumber), 'i');
  }
  if (query.owner) {
    filter['normalizedRow.truckOwnerName'] = new RegExp(String(query.owner), 'i');
  }
  if (query.destination) {
    filter['normalizedRow.destination'] = new RegExp(String(query.destination), 'i');
  }
  if (query.startDate || query.endDate) {
    filter['normalizedRow.invDate'] = {};
    if (query.startDate) filter['normalizedRow.invDate'].$gte = new Date(query.startDate);
    if (query.endDate) filter['normalizedRow.invDate'].$lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    LoadRow.find(filter)
      .populate('transportCompanyId', 'companyName companyCode')
      .populate('clientCompanyId', 'companyName companyCode')
      .populate('plantId', 'plantName plantCode')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    LoadRow.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getImportSessionDetails(sessionId) {
  const session = await ImportSession.findById(sessionId);
  if (!session) {
    const error = new Error('Import session not found');
    error.statusCode = 404;
    throw error;
  }

  const rows = await LoadRow.find({ importSessionId: sessionId }).sort({ sourceRowNumber: 1 });
  return { session, rows };
}

export async function updateImportRow(sessionId, rowId, payload = {}, currentUser) {
  const row = await LoadRow.findOne({ _id: rowId, importSessionId: sessionId });
  if (!row) {
    const error = new Error('Import row not found');
    error.statusCode = 404;
    throw error;
  }

  const nextNormalizedRow = { ...row.normalizedRow };
  const newEditedValues = { ...(row.editedValues || {}) };

  Object.entries(payload.normalizedRow || {}).forEach(([key, value]) => {
    const normalized = normalizeEditedField(key, value);
    nextNormalizedRow[key] = normalized;
    newEditedValues[key] = value;

    if (key === 'dieselAmount') {
      nextNormalizedRow.dieselAmountRaw = value != null ? String(value) : null;
    }
  });

  if (nextNormalizedRow.rfidTag !== undefined || nextNormalizedRow.gpsInstall !== undefined) {
    nextNormalizedRow.rfid = nextNormalizedRow.rfidTag;
    nextNormalizedRow.gps = nextNormalizedRow.gpsInstall;
    nextNormalizedRow.rfidGps = (nextNormalizedRow.rfid || 0) + (nextNormalizedRow.gps || 0);
    nextNormalizedRow.RFID_GPS = nextNormalizedRow.rfidGps;
  }

  const masterMatch = await compareWithMaster(nextNormalizedRow);
  const validationMessages = validateNormalizedRow(nextNormalizedRow, row.sourceRowNumber, masterMatch, row.rawRow);

  row.normalizedRow = {
    ...nextNormalizedRow,
    truckExists: masterMatch.truckExists,
    ownerMatches: masterMatch.ownerMatches,
    panMatches: masterMatch.panMatches
  };
  row.rawRow = {
    ...row.rawRow,
    ...payload.rawRow
  };
  row.editedValues = newEditedValues;
  row.editStatus = 'edited';
  row.validationMessages = validationMessages;
  row.approvalStatus = 'pending';
  row.updatedBy = currentUser?.id || currentUser?._id;
  await row.save();

  await refreshSessionCounts(sessionId);
  return row;
}

export async function deleteImportRow(sessionId, rowId, currentUser) {
  const row = await LoadRow.findOne({ _id: rowId, importSessionId: sessionId });
  if (!row) {
    const error = new Error('Import row not found');
    error.statusCode = 404;
    throw error;
  }

  await row.deleteOne();
  await refreshSessionCounts(sessionId);
  return { deleted: true, rowId, sessionId, updatedBy: currentUser?.id || currentUser?._id };
}

export async function approveImportRow(sessionId, rowId, currentUser) {
  const row = await LoadRow.findOne({ _id: rowId, importSessionId: sessionId });
  if (!row) {
    const error = new Error('Import row not found');
    error.statusCode = 404;
    throw error;
  }

  row.approvalStatus = 'approved';
  row.updatedBy = currentUser?.id || currentUser?._id;
  await row.save();
  await refreshSessionCounts(sessionId);
  return row;
}

export async function rejectImportRow(sessionId, rowId, currentUser) {
  const row = await LoadRow.findOne({ _id: rowId, importSessionId: sessionId });
  if (!row) {
    const error = new Error('Import row not found');
    error.statusCode = 404;
    throw error;
  }

  row.approvalStatus = 'rejected';
  row.updatedBy = currentUser?.id || currentUser?._id;
  await row.save();
  await refreshSessionCounts(sessionId);
  return row;
}

export async function cancelImportSession(sessionId, currentUser) {
  const session = await ImportSession.findById(sessionId);
  if (!session) {
    const error = new Error('Import session not found');
    error.statusCode = 404;
    throw error;
  }

  session.status = 'cancelled';
  session.updatedBy = currentUser?.id || currentUser?._id;
  await session.save();
  return session;
}

export async function saveImportSession(sessionId, currentUser) {
  const session = await ImportSession.findById(sessionId);
  if (!session) {
    const error = new Error('Import session not found');
    error.statusCode = 404;
    throw error;
  }

  session.status = 'saved';
  session.updatedBy = currentUser?.id || currentUser?._id;
  await session.save();
  return session;
}

export { parseLoadWorkbook } from './excelParser.service.js';



