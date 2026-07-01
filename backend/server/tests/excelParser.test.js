import { describe, expect, it } from 'vitest';
import xlsx from 'xlsx';
import { parseMasterWorkbook } from '../src/services/excelParser.service.js';

function workbookBuffer() {
  const workbook = xlsx.utils.book_new();
  const masterSheet = xlsx.utils.aoa_to_sheet([
    ['Report title row'],
    [
      'INV NO.', 'INV DATE.', 'GR/RR NO.', 'DI NO.', "DEPOT/PARTY'S NAME", 'DESTINATION', 'PODUCT NAME',
      'TRUCK NO.', 'TRUCK OWNER NAME', 'PAN NO', 'QTY', 'FRT-PMT', 'FRT AMT', 'BILL NO', 'BILL DATE',
      'RFID TAG', 'GPS INSTALL', 'LESS: DIESEL(Ltr)', 'DIESEL AMOUNT', 'LESS: ADVANCE', 'UREA', 'BAG SHORTAGE'
    ],
    ['INV-1', 46143, 'GR-1', 'DI-1', 'Party One', 'Purulia', 'Product', 'MH12AB1234', 'Sharma Logistics', 'ABCDE1234F', 30, 1400, 42000, 'B-1', 46144, '', '', '', '', 4500, '', ''],
    ['INV-2', '', '', '', 'Party Two', 'Dhanbad', 'Product', ' ka 01 aa 9999 ', 'South Carrier', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ]);
  const otherSheet = xlsx.utils.aoa_to_sheet([
    ['INV NO.', 'INV DATE.', 'GR/RR NO.', 'DI NO.', "DEPOT/PARTY'S NAME", 'DESTINATION', 'PODUCT NAME', 'TRUCK NO.', 'TRUCK OWNER NAME', 'PAN NO', 'QTY', 'FRT-PMT', 'FRT AMT', 'BILL NO', 'BILL DATE', 'RFID TAG', 'GPS INSTALL', 'LESS: DIESEL(Ltr)', 'DIESEL AMOUNT', 'LESS: ADVANCE', 'UREA', 'BAG SHORTAGE'],
    ['INV-3', 46145, 'GR-2', 'DI-2', 'Party Three', 'Asansol', 'Product', 'DL01CD1111', 'North Transport', 'AAAAA1111A', 12, 900, 10800, 'B-2', 46146, '', '', '', '', '', '', '']
  ]);

  xlsx.utils.book_append_sheet(workbook, masterSheet, 'Master');
  xlsx.utils.book_append_sheet(workbook, otherSheet, 'Extra Master');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('parseMasterWorkbook', () => {
  it('detects headers across sheets and extracts master fields', () => {
    const result = parseMasterWorkbook(workbookBuffer(), { gstRate: 18 });

    expect(result.workbookSheetCount).toBe(2);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      sheetName: 'Master',
      rowNumber: 3,
      truckNo: 'MH12AB1234',
      ownerName: 'Sharma Logistics',
      ownerPan: 'ABCDE1234F',
      normalizedFields: expect.objectContaining({
        truckNo: 'MH12AB1234',
        truckOwnerName: 'Sharma Logistics',
        ownerPan: 'ABCDE1234F',
        qty: 30,
        frtAmt: 42000
      })
    });
    expect(result.rows[1].truckNo).toBe('KA01AA9999');
    expect(result.rows[2].sheetName).toBe('Extra Master');
  });
});
