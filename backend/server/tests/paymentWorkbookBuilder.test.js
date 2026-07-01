import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildPaymentWorkbook, paymentTemplatePath } from '../src/excel/paymentWorkbookBuilder.js';

function trip(index = 0, overrides = {}) {
  return {
    truckNo: index % 2 ? 'JH10DE2279' : 'JH10DC8969',
    invoiceDate: new Date('2026-05-16T00:00:00.000Z'),
    partyName: `Party ${index + 1}`,
    destination: 'Purulia',
    cashAdvanceDate: new Date('2026-05-15T00:00:00.000Z'),
    repeatedTrip: index > 0,
    rowValues: {
      qty: 10,
      rate: 1000,
      amount: 10000,
      comm: index > 0 ? 0 : 900,
      gross: index > 0 ? 10000 : 9100,
      bagShortage: 0,
      diesel: 100,
      cashAdvance: 200,
      rfidGps: 50,
      netAmount: index > 0 ? 9650 : 8750
    },
    ...overrides
  };
}

function block(ownerName, rows) {
  const sum = (field) => rows.reduce((total, row) => total + Number(row.rowValues[field] || 0), 0);
  return {
    ownerNameSnapshot: ownerName,
    ownerPanSnapshot: 'ABCDE1234F',
    gstApplicableSnapshot: true,
    cgstRateSnapshot: 9,
    sgstRateSnapshot: 9,
    rows,
    totals: {
      totalQty: sum('qty'), totalAmount: sum('amount'), totalCommission: sum('comm'),
      totalGross: sum('gross'), totalShortage: sum('bagShortage'), totalDiesel: sum('diesel'),
      totalCashAdvance: sum('cashAdvance'), totalRfidGps: sum('rfidGps')
    },
    summaryRows: [
      { templateRow: 10, key: 'taxableValue', label: 'TAXABLE VALUE', value: sum('gross') },
      { templateRow: 11, key: 'cgst', label: 'ADD: CGST @9%', value: 819 },
      { templateRow: 12, key: 'sgst', label: 'ADD: SGST @9%', value: 819 },
      { templateRow: 13, key: 'netBillAmount', label: 'NET BILL AMOUNT', value: 10738 },
      { templateRow: 14, key: 'lessDiesel', label: 'LESS: DIESEL', value: sum('diesel') },
      { templateRow: 15, key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: sum('cashAdvance') },
      { templateRow: 16, key: 'lessShortage', label: 'LESS: SHORTAGE', value: sum('bagShortage') },
      { templateRow: 17, key: 'lessTds', label: 'LESS: TDS', value: 91 },
      { templateRow: 18, key: 'roundOff', label: 'ROUND OFF', value: 0 },
      { templateRow: 19, key: 'netPayable', label: 'NET PAYABLE', value: sum('netAmount') }
    ],
    summaryValues: {
      gstApplicable: true,
      cgstRate: 9,
      sgstRate: 9,
      cgstAmount: 819,
      sgstAmount: 819,
      taxableValue: sum('gross'), cgst: 819, sgst: 819, netBillAmount: 10738,
      lessDiesel: sum('diesel'), lessCashAdvance: sum('cashAdvance'), lessShortage: sum('bagShortage'),
      lessTds: 91, roundOff: 0, netPayable: sum('netAmount')
    }
  };
}

const run = {
  periodStart: new Date('2026-05-01T00:00:00.000Z'),
  periodEnd: new Date('2026-05-31T00:00:00.000Z'),
  exportContext: {
    transportCompany: 'Krishna Roadways', transportGst: '20ABCDE1234F1Z5',
    clientCompany: 'Shree Cement', plant: 'Purulia'
  }
};

async function readBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function workbookPlaceholders(workbook) {
  const found = [];
  workbook.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => {
    if (typeof cell.value === 'string' && cell.value.includes('{{')) found.push(`${sheet.name}!${cell.address}`);
  })));
  return found;
}

describe('template payment workbook builder', () => {
  it('renders one owner and one trip from snapshot values with template formatting', async () => {
    const ownerBlock = block('Balaji Transportation & Logistics', [trip()]);
    const { excelBuffer } = await buildPaymentWorkbook({ run, blocks: [ownerBlock] });
    const workbook = await readBuffer(excelBuffer);
    const combined = workbook.getWorksheet('Combined Payment Sheet');
    const ownerSheet = workbook.worksheets[1];
    const template = new ExcelJS.Workbook();
    await template.xlsx.readFile(paymentTemplatePath);

    expect(workbook.worksheets).toHaveLength(2);
    expect(combined.getCell('A1').value).toContain('Krishna Roadways');
    expect(combined.getCell('C6').value).toBe('JH10DC8969');
    expect(combined.getCell('I6').value).toBe(900);
    expect(combined.getCell('I6').numFmt).toBe('#,##0.00');
    expect(combined.getCell('B6').numFmt).toBe('dd/mm/yyyy');
    expect(combined.getRow(6).height).toBe(template.worksheets[0].getRow(6).height);
    expect(combined.getCell('I6').border).toEqual(template.worksheets[0].getCell('I6').border);
    expect(ownerSheet.getCell('I6').value).toBe(combined.getCell('I6').value);
    expect(workbookPlaceholders(workbook)).toEqual([]);
  });

  it('renders every owner, repeated trips, and 100+ dynamic rows without losing totals', async () => {
    const largeRows = Array.from({ length: 105 }, (_, index) => trip(index));
    const firstBlock = block('Large Owner', largeRows);
    const secondBlock = block('Second Owner', [trip(0, { truckNo: 'WB11AA1111' }), trip(1, { truckNo: 'WB11AA1111' })]);
    const { excelBuffer } = await buildPaymentWorkbook({ run, blocks: [firstBlock, secondBlock] });
    const workbook = await readBuffer(excelBuffer);
    const combined = workbook.getWorksheet('Combined Payment Sheet');
    const firstTotalRow = 7 + 104;
    const secondBlockStart = 19 + 104 + 4;

    expect(workbook.worksheets).toHaveLength(3);
    expect(combined.getCell(`F${firstTotalRow}`).value).toBe(1050);
    expect(combined.getCell(`A${secondBlockStart}`).value).toContain('Second Owner');
    expect(combined.getCell(`C${secondBlockStart + 5}`).value).toBe('WB11AA1111');
    expect(workbook.getWorksheet('Large Owner').getCell('C110').value).toBe(largeRows[104].truckNo);
    expect(workbook.getWorksheet('Second Owner').getCell('I6').value).toBe(900);
    expect(workbook.getWorksheet('Second Owner').getCell('I7').value).toBe(0);
    expect(workbookPlaceholders(workbook)).toEqual([]);
  });

  it('omits GST rows when the snapshot says GST is not applicable', async () => {
    const ownerBlock = block('No GST Owner', [trip()]);
    ownerBlock.gstApplicableSnapshot = false;
    ownerBlock.summaryRows = [
      { templateRow: 10, key: 'taxableValue', label: 'TAXABLE VALUE', value: 9100 },
      { templateRow: 14, key: 'lessDiesel', label: 'LESS: DIESEL', value: 100 },
      { templateRow: 15, key: 'lessCashAdvance', label: 'LESS: CASH ADVANCE', value: 200 },
      { templateRow: 16, key: 'lessShortage', label: 'LESS: SHORTAGE', value: 0 },
      { templateRow: 17, key: 'lessTds', label: 'LESS: TDS', value: 91 },
      { templateRow: 18, key: 'roundOff', label: 'ROUND OFF', value: 0 },
      { templateRow: 19, key: 'netPayable', label: 'NET PAYABLE', value: 8709 }
    ];
    ownerBlock.summaryValues = {
      gstApplicable: false,
      cgstRate: 9,
      sgstRate: 9,
      cgstAmount: 0,
      sgstAmount: 0,
      taxableValue: 9100,
      cgst: 0,
      sgst: 0,
      netBillAmount: 9100,
      lessDiesel: 100,
      lessCashAdvance: 200,
      lessShortage: 0,
      lessTds: 91,
      roundOff: 0,
      netPayable: 8709
    };

    const { excelBuffer } = await buildPaymentWorkbook({ run, blocks: [ownerBlock] });
    const workbook = await readBuffer(excelBuffer);
    const combined = workbook.getWorksheet('Combined Payment Sheet');

    expect(combined.getCell('D10').value).toBe(9100);
    expect(combined.getCell('D11').value).toBe(100);
    expect(combined.getCell('D12').value).toBe(200);
    expect(combined.getCell('D16').value).toBe(8709);
  });
});
