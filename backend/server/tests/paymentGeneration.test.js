import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getPaymentPreview, savePaymentRun } from '../src/services/paymentGeneration.service.js';

// ── Hoisted mock functions ──────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  settingFindOne: vi.fn(),
  settingCreate: vi.fn(),
  commissionRuleFind: vi.fn(),
  ownerMasterFind: vi.fn(),
  truckMasterFindOne: vi.fn(),
  loadRowFind: vi.fn(),
  paymentRunCreate: vi.fn(async (payload) => ({
    _id: new mongoose.Types.ObjectId(),
    ...payload,
    save: vi.fn()
  })),
  paymentBlockCreate: vi.fn(async (payload) => ({
    _id: new mongoose.Types.ObjectId(),
    ...payload
  })),
  paymentRowInsertMany: vi.fn(async (rows) =>
    rows.map(() => ({ _id: new mongoose.Types.ObjectId() }))
  ),
  loadRowUpdateMany: vi.fn()
}));

// ── Model mocks ─────────────────────────────────────────────────────────────
vi.mock('../src/models/Setting.js', () => ({
  Setting: { findOne: mocks.settingFindOne, create: mocks.settingCreate }
}));

vi.mock('../src/models/CommissionRule.js', () => ({
  CommissionRule: { find: mocks.commissionRuleFind }
}));

vi.mock('../src/models/OwnerMaster.js', () => ({
  OwnerMaster: { find: mocks.ownerMasterFind }
}));

vi.mock('../src/models/TruckMaster.js', () => ({
  TruckMaster: { findOne: mocks.truckMasterFindOne }
}));

vi.mock('../src/models/MasterImport.js', () => ({
  LoadRow: { find: mocks.loadRowFind, updateMany: mocks.loadRowUpdateMany }
}));

vi.mock('../src/models/PaymentRun.js', () => ({
  PaymentRun: { create: mocks.paymentRunCreate }
}));

vi.mock('../src/models/PaymentBlock.js', () => ({
  PaymentBlock: { create: mocks.paymentBlockCreate }
}));

vi.mock('../src/models/PaymentRow.js', () => ({
  PaymentRow: { insertMany: mocks.paymentRowInsertMany }
}));

// ── Shared test data helpers ─────────────────────────────────────────────────
function makeOwner(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    ownerName: 'Owner A',
    normalizedOwnerName: 'OWNER A',
    panNumber: 'ABCDE1234F',
    tdsPercentage: 1,
    commissionType: 'fixed',
    commissionValue: 900,
    status: 'active',
    ...overrides
  };
}

function makeLoadRow(truckNo, invDate, overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    approvalStatus: 'approved',
    transportCompanyId: 'transport-1',
    clientCompanyId: 'client-1',
    plantId: 'plant-1',
    normalizedRow: {
      truckNo,
      truckOwnerName: 'Owner A',
      partyName: 'Depot One',
      destination: 'Kolkata',
      invDate,
      qty: 30,
      frtPmt: 1000,
      frtAmt: 30000,
      dieselAmount: 2000,
      lessAdvance: 5000,
      rfid: 100,
      gps: 50,
      ...overrides
    }
  };
}

const DEFAULT_SETTINGS = {
  companyName: 'SHREE CEMENT LTD.',
  gstRate: 18,
  cgstRate: 9,
  sgstRate: 9,
  defaultRoundingRule: 'round'
};

// ── Test Suite ───────────────────────────────────────────────────────────────
describe('Payment generation workflow & business calculations', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear?.());
    mocks.settingFindOne.mockResolvedValue(DEFAULT_SETTINGS);
    mocks.commissionRuleFind.mockResolvedValue([]); // Default: no rules, use owner default
  });

  // ── Test 1: repeated same truck + same date - fixed commission applied once ──
  it('keeps repeated truck-and-date rows visible and applies fixed commission only to first row', async () => {
    const owner = makeOwner({ commissionValue: 900 });

    mocks.ownerMasterFind.mockResolvedValue([owner]);
    mocks.truckMasterFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue({ ownerId: owner })
    }));

    const date = new Date('2026-05-10T00:00:00.000Z');
    const testRows = [
      makeLoadRow('WB60A1234', date, { qty: 30, frtAmt: 30000, dieselAmount: 2000, lessAdvance: 5000, rfid: 100, gps: 50 }),
      makeLoadRow('WB60A1234', date, { qty: 20, frtAmt: 20000, dieselAmount: 1000, lessAdvance: 3000, rfid: 100, gps: 50 })
    ];

    mocks.loadRowFind.mockResolvedValue(testRows);

    const preview = await getPaymentPreview({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      transportCompanyId: 'transport-1',
      clientCompanyId: 'client-1',
      plantId: 'plant-1'
    });

    expect(preview.blocks).toHaveLength(1);
    const block = preview.blocks[0];
    expect(block.ownerNameSnapshot).toBe('Owner A');

    // NOT merged — both rows stay separate
    expect(block.rows).toHaveLength(2);

    const firstRow = block.rows[0];
    const secondRow = block.rows[1];

    expect(firstRow.rowValues.qty).toBe(30);
    expect(firstRow.rowValues.amount).toBe(30000);
    expect(firstRow.rowValues.comm).toBe(900);
    expect(firstRow.rowValues.gross).toBe(29100);
    expect(firstRow.commissionUsed.source).toBe('Owner Default');

    expect(secondRow.rowValues.qty).toBe(20);
    expect(secondRow.rowValues.amount).toBe(20000);
    expect(secondRow.rowValues.comm).toBe(0); // commission zeroed for repeated trip
    expect(secondRow.rowValues.gross).toBe(20000);
    expect(secondRow.commissionUsed.source).toBe('Commission Applied Above');

    // Block totals
    expect(block.totals.totalQty).toBe(50);
    expect(block.totals.totalAmount).toBe(50000);
    expect(block.totals.totalCommission).toBe(900);
    expect(block.totals.totalGross).toBe(49100);

    // Summary
    expect(block.summaryValues.taxableValue).toBe(49100);
    const expectedCgst = Math.round(49100 * 0.09 * 100) / 100;
    expect(block.summaryValues.cgst).toBeCloseTo(expectedCgst, 0);
    expect(block.summaryValues.netPayable).toBe(46447);
  });

  // ── Test 2: Commission Master rule resolution order ────────────────────────
  it('resolves commission from Truck Rule → Default Rule → Owner Default in priority order', async () => {
    const owner = makeOwner({ commissionValue: 900 });

    mocks.ownerMasterFind.mockResolvedValue([owner]);
    mocks.truckMasterFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue({ ownerId: owner })
    }));

    const row = makeLoadRow('JH10CQ3188', new Date('2026-05-12T00:00:00.000Z'), {
      qty: 40,
      frtPmt: 1000,
      frtAmt: 40000,
      dieselAmount: 0,
      lessAdvance: 0,
      rfid: 0,
      gps: 0
    });
    mocks.loadRowFind.mockResolvedValue([row]);

    // Case 1: Truck Rule — most specific match
    mocks.commissionRuleFind.mockResolvedValue([
      {
        ownerId: owner._id,
        transportCompanyId: 'transport-1',
        clientCompanyId: 'client-1',
        plantId: 'plant-1',
        truckNumber: 'JH10CQ3188',
        commissionType: 'fixed',
        commissionValue: 1500,
        status: 'active'
      }
    ]);

    let preview = await getPaymentPreview({ startDate: '2026-05-01', endDate: '2026-05-31' });
    let payRow = preview.blocks[0].rows[0];
    expect(payRow.rowValues.comm).toBe(1500);
    expect(payRow.commissionUsed.source).toBe('Truck Rule');
    expect(payRow.commissionUsed.type).toBe('fixed');
    expect(payRow.commissionUsed.value).toBe(1500);
    expect(payRow.commissionUsed.amount).toBe(1500);

    // Case 2: Default Rule — truck not matched, but Owner+Route matched
    mocks.commissionRuleFind.mockResolvedValue([
      {
        ownerId: owner._id,
        transportCompanyId: 'transport-1',
        clientCompanyId: 'client-1',
        plantId: 'plant-1',
        truckNumber: '',
        commissionType: 'fixed',
        commissionValue: 800,
        status: 'active'
      }
    ]);

    preview = await getPaymentPreview({ startDate: '2026-05-01', endDate: '2026-05-31' });
    payRow = preview.blocks[0].rows[0];
    expect(payRow.rowValues.comm).toBe(800);
    expect(payRow.commissionUsed.source).toBe('Default Rule');

    // Case 3: Owner Default — no rules at all
    mocks.commissionRuleFind.mockResolvedValue([]);

    preview = await getPaymentPreview({ startDate: '2026-05-01', endDate: '2026-05-31' });
    payRow = preview.blocks[0].rows[0];
    expect(payRow.rowValues.comm).toBe(900);
    expect(payRow.commissionUsed.source).toBe('Owner Default');
  });

  // ── Test 3: Percentage commission applied per-row independently ─────────────
  it('calculates percentage commission independently on each row', async () => {
    const owner = makeOwner({ commissionType: 'percentage', commissionValue: 2 });

    mocks.ownerMasterFind.mockResolvedValue([owner]);
    mocks.truckMasterFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue({ ownerId: owner })
    }));

    const date = new Date('2026-05-15T00:00:00.000Z');
    const testRows = [
      makeLoadRow('KA01AB1111', date, { qty: 40, frtAmt: 40000, dieselAmount: 0, lessAdvance: 0, rfid: 0, gps: 0 }),
      makeLoadRow('KA01AB1111', date, { qty: 30, frtAmt: 30000, dieselAmount: 0, lessAdvance: 0, rfid: 0, gps: 0 })
    ];

    mocks.loadRowFind.mockResolvedValue(testRows);

    // Percentage rule from Commission Master
    mocks.commissionRuleFind.mockResolvedValue([
      {
        ownerId: owner._id,
        transportCompanyId: 'transport-1',
        clientCompanyId: 'client-1',
        plantId: 'plant-1',
        truckNumber: '',
        commissionType: 'percentage',
        commissionValue: 2,
        status: 'active'
      }
    ]);

    const preview = await getPaymentPreview({ startDate: '2026-05-01', endDate: '2026-05-31' });
    const block = preview.blocks[0];

    expect(block.rows).toHaveLength(2);
    expect(block.rows[0].rowValues.comm).toBe(800); // 2% of 40000
    expect(block.rows[0].commissionUsed.source).toBe('Default Rule');
    expect(block.rows[1].rowValues.comm).toBe(600); // 2% of 30000 — NOT zero
    expect(block.rows[1].commissionUsed.source).toBe('Default Rule'); // percentage doesn't zero out
  });
});
