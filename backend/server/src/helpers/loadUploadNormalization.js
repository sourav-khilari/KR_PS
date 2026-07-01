import { normalizeOwnerName, normalizePan, normalizeText, normalizeTruckNumber } from './normalize.js';

function safeTrim(value) {
  if (value === null || value === undefined) return null;
  const text = normalizeText(value);
  return text === '' ? '' : text;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeLoadUploadRow(rawRow = {}) {
  return {
    invNo: safeTrim(rawRow['INV NO.']),
    invDate: safeDate(rawRow['INV DATE.']),
    grRrNo: safeTrim(rawRow['GR/RR NO.']),
    diNo: safeTrim(rawRow['DI NO.']),
    partyName: safeTrim(rawRow["DEPOT/PARTY'S NAME"]),
    destination: safeTrim(rawRow['DESTINATION']),
    productName: safeTrim(rawRow['PODUCT NAME']),
    truckNo: normalizeTruckNumber(rawRow['TRUCK NO.']),
    truckOwnerName: normalizeOwnerName(rawRow['TRUCK OWNER NAME']),
    panNo: normalizePan(rawRow['PAN NO']),
    qty: safeNumber(rawRow['QTY']),
    frtPmt: safeNumber(rawRow['FRT-PMT']),
    frtAmt: safeNumber(rawRow['FRT AMT']),
    billNo: safeTrim(rawRow['BILL NO']),
    billDate: safeDate(rawRow['BILL DATE']),
    rfidTag: safeTrim(rawRow['RFID TAG']),
    gpsInstall: safeTrim(rawRow['GPS INSTALL']),
    lessDieselLtr: safeNumber(rawRow['LESS: DIESEL(Ltr)']),
    dieselAmount: safeNumber(rawRow['DIESEL AMOUNT']),
    lessAdvance: safeNumber(rawRow['LESS: ADVANCE']),
    urea: safeNumber(rawRow['UREA']),
    bagShortage: safeNumber(rawRow['BAG SHORTAGE'])
  };
}

export function rowToRawPreview(rawRow) {
  return Object.fromEntries(Object.entries(rawRow || {}).map(([key, value]) => [key, value ?? '']));
}
