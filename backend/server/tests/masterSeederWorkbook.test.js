import { describe, expect, it } from 'vitest';
import xlsx from 'xlsx';
import { parseTrustedSeederWorkbook } from '../src/excel/masterSeederWorkbook.js';

function buildLoadWorkbook() {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([
    ['KRISHNA ROADWAYS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['INV NO.', 'INV DATE.', 'GR/RR NO.', 'DI NO.', 'DEPOT/PARTY\'S NAME', 'DESTINATION', 'PODUCT NAME', 'TRUCK NO.', 'TRUCK OWNER NAME', 'PAN NO', 'QTY', 'FRT-PMT', 'FRT AMT'],
    ['WB2601006571', 46143, '1301/KR/124', 9003856333, 'APNA GHAR', 'SUPAUL', 'BNR-MARBEL PSC LPP BAG', 'JH10DB3312', 'P K SINGH', '', 30, 1400, 42000]
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, 'MAY2026');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function buildPaymentWorkbook() {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['M/S KRISHNA ROADWAYS (20BIVPS6798F3ZF)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Truck Owner Name : Balaji Transportation & Logistics', '', '', '', '', 'SHREE CEMENT LTD., PURULIA', '', '', '', '', '', '', '', '', '', ''],
    ['PAN NO: ABEFB6995Q', '', '', '', 'PAYMENT SHEET FROM 01.06.2026 TO 15.06.2026', '', '', '', '', '', '', '', '', '', '', ''],
    ['Sl', 'Date', 'Truck No', 'Party Name', 'Dest.', 'Qty', 'Rate', 'Amount', 'Less: Comm', 'Gross', 'Short of bags', 'Diesel', 'Date of Cash Adv', 'Cash Adv', 'Less: RFID & GPS', 'Net Amt'],
    [1, 46174, 'JH10DC8969', 'SCL-RAJAUN', 'RAJAUN', 30, 983, 29490, 900, 28590, 0, 0, 46174, 0, 0, 28590]
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, '01.06.26 to 15.06.26');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('parseTrustedSeederWorkbook', () => {
  it('extracts rows from the load workbook', () => {
    const result = parseTrustedSeederWorkbook(buildLoadWorkbook(), 'PURULIA TRUCK LOAD DETAILS (2026-27).xlsx');

    expect(result.workbookSheetCount).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      sourceSheetName: 'MAY2026',
      sourceRowNumber: 3,
      truckNumber: 'JH10DB3312',
      ownerName: 'P K SINGH',
      sourceType: 'load'
    });
  });

  it('extracts truck, owner, and PAN from payment workbook rows', () => {
    const result = parseTrustedSeederWorkbook(buildPaymentWorkbook(), 'SHREE PURULIA PAYMENT (2026-27).xlsx');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      sourceSheetName: '01.06.26 to 15.06.26',
      truckNumber: 'JH10DC8969',
      ownerName: 'Balaji Transportation & Logistics',
      ownerPan: 'ABEFB6995Q',
      sourceType: 'payment'
    });
  });
});
