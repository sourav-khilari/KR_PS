import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import xlsx from 'xlsx';
import { exportPaymentRunExcel, savePaymentRun } from '../src/services/paymentGeneration.service.js';

const mocks = vi.hoisted(() => ({
  insertedRows: [],
  paymentRunCreate: vi.fn(),
  paymentRunFindById: vi.fn(),
  paymentBlockCreate: vi.fn(),
  paymentBlockFind: vi.fn(),
  paymentRowInsertMany: vi.fn(),
  paymentRowFind: vi.fn(),
  loadRowUpdateMany: vi.fn(),
  settingFindOne: vi.fn()
}));

vi.mock('../src/models/PaymentRun.js', () => ({
  PaymentRun: { create: mocks.paymentRunCreate, findById: mocks.paymentRunFindById }
}));
vi.mock('../src/models/PaymentBlock.js', () => ({
  PaymentBlock: { create: mocks.paymentBlockCreate, find: mocks.paymentBlockFind }
}));
vi.mock('../src/models/PaymentRow.js', () => ({
  PaymentRow: { insertMany: mocks.paymentRowInsertMany, find: mocks.paymentRowFind }
}));
vi.mock('../src/models/MasterImport.js', () => ({
  LoadRow: { find: vi.fn(), updateMany: mocks.loadRowUpdateMany }
}));
vi.mock('../src/models/Setting.js', () => ({
  Setting: { findOne: mocks.settingFindOne, create: vi.fn() }
}));
vi.mock('../src/models/CommissionRule.js', () => ({ CommissionRule: { find: vi.fn() } }));
vi.mock('../src/models/OwnerMaster.js', () => ({ OwnerMaster: { find: vi.fn() } }));
vi.mock('../src/models/TruckMaster.js', () => ({ TruckMaster: { findOne: vi.fn(), find: vi.fn() } }));

const commissionUsed = {
  type: 'fixed', value: 900, amount: 900, source: 'Truck Rule',
  matchedRuleId: 'owner-map:key', fallbackUsed: false
};

function paymentRow() {
  return {
    sourceImportRowIds: [new mongoose.Types.ObjectId()],
    truckNo: 'JH10DE2279',
    invoiceDate: new Date('2026-05-16T00:00:00.000Z'),
    partyName: 'Party', destination: 'Purulia', cashAdvanceDate: null,
    repeatedTrip: false,
    rowValues: { qty: 10, rate: 1000, amount: 10000, comm: 900, gross: 9100, diesel: 0, cashAdvance: 0, rfidGps: 0, bagShortage: 0, netAmount: 9100 },
    commissionUsed,
    gstUsed: { applicable: true, cgstRate: 9, sgstRate: 9, cgstAmount: 819, sgstAmount: 819, netBillAmount: 10738 },
    tdsUsed: { rate: 1, amount: 91 }, netPayableUsed: 9100
  };
}

describe('payment commission snapshot', () => {
  beforeEach(() => {
    mocks.insertedRows.length = 0;
    const runId = new mongoose.Types.ObjectId();
    mocks.paymentRunCreate.mockResolvedValue({ _id: runId, save: vi.fn() });
    mocks.paymentBlockCreate.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    mocks.paymentRowInsertMany.mockImplementation(async (rows) => { mocks.insertedRows.push(...rows); return rows; });
    mocks.settingFindOne.mockResolvedValue({ companyName: 'SHREE CEMENT LTD.', plantName: 'PURULIA', companyGstin: '' });
  });

  it('generation saves the exact preview commission resolution', async () => {
    const row = paymentRow();
    await savePaymentRun({
      periodStart: '2026-05-01', periodEnd: '2026-05-31', totals: {},
      blocks: [{
        ownerId: new mongoose.Types.ObjectId(), ownerNameSnapshot: 'Balaji', ownerPanSnapshot: '',
        gstApplicableSnapshot: true,
        cgstRateSnapshot: 9,
        sgstRateSnapshot: 9,
        totals: {}, summaryRows: [], summaryValues: { gstApplicable: true, cgstRate: 9, sgstRate: 9 }, rows: [row]
      }]
    }, { id: new mongoose.Types.ObjectId() });

    const createdBlockPayload = mocks.paymentBlockCreate.mock.calls[0][0];
    expect(createdBlockPayload.gstApplicableSnapshot).toBe(true);
    expect(createdBlockPayload.cgstRateSnapshot).toBe(9);
    expect(createdBlockPayload.sgstRateSnapshot).toBe(9);

    expect(mocks.insertedRows[0].commissionUsed).toEqual(commissionUsed);
    expect(mocks.insertedRows[0].rowValues.comm).toBe(900);
    expect(mocks.insertedRows[0].gstUsed).toEqual({ applicable: true, cgstRate: 9, sgstRate: 9, cgstAmount: 819, sgstAmount: 819, netBillAmount: 10738 });
  });

  it('export reads the saved PaymentRow commission snapshot', async () => {
    const runId = new mongoose.Types.ObjectId();
    const blockId = new mongoose.Types.ObjectId();
    const row = paymentRow();
    mocks.paymentRunFindById.mockResolvedValue({
      _id: runId, periodStart: new Date('2026-05-01'), periodEnd: new Date('2026-05-31'), outputFileName: 'payment.xlsx'
    });
    mocks.paymentBlockFind.mockResolvedValue([{
      _id: blockId, ownerNameSnapshot: 'Balaji', ownerPanSnapshot: '',
      totals: { totalQty: 10, totalAmount: 10000, totalCommission: 900, totalGross: 9100, totalShortage: 0, totalDiesel: 0, totalCashAdvance: 0, totalRfidGps: 0 },
      summaryValues: { taxableValue: 9100, cgst: 819, sgst: 819, netBillAmount: 10738, lessDiesel: 0, lessCashAdvance: 0, lessShortage: 0, lessTds: 91, roundOff: 0, netPayable: 10647 }
    }]);
    mocks.paymentRowFind.mockReturnValue({ sort: vi.fn().mockResolvedValue([row]) });

    const { excelBuffer } = await exportPaymentRunExcel(runId);
    const workbook = xlsx.read(excelBuffer, { type: 'buffer', cellFormula: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    expect(sheet.I7.v).toBe(900);
  });
});
