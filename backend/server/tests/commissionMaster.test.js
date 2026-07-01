import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getPaymentPreview, savePaymentRun } from '../src/services/paymentGeneration.service.js';

const mocks = vi.hoisted(() => ({
  settingFindOne: vi.fn(),
  settingCreate: vi.fn(),
  commissionRuleFind: vi.fn(),
  ownerMasterFind: vi.fn(),
  truckMasterFindOne: vi.fn(),
  loadRowFind: vi.fn(),
  paymentRunCreate: vi.fn(async (payload) => ({ _id: new mongoose.Types.ObjectId(), ...payload, save: vi.fn() })),
  paymentBlockCreate: vi.fn(async (payload) => ({ _id: new mongoose.Types.ObjectId(), ...payload })),
  paymentRowInsertMany: vi.fn(async (rows) => rows.map((r, i) => ({ _id: new mongoose.Types.ObjectId(), ...r }))),
  loadRowUpdateMany: vi.fn()
}));

vi.mock('../src/models/Setting.js', () => ({
  Setting: {
    findOne: mocks.settingFindOne,
    create: mocks.settingCreate
  }
}));

vi.mock('../src/models/CommissionRule.js', () => ({
  CommissionRule: {
    find: mocks.commissionRuleFind
  }
}));

vi.mock('../src/models/OwnerMaster.js', () => ({
  OwnerMaster: {
    find: mocks.ownerMasterFind
  }
}));

vi.mock('../src/models/TruckMaster.js', () => ({
  TruckMaster: {
    findOne: mocks.truckMasterFindOne
  }
}));

vi.mock('../src/models/MasterImport.js', () => ({
  LoadRow: {
    find: mocks.loadRowFind,
    updateMany: mocks.loadRowUpdateMany
  }
}));

vi.mock('../src/models/PaymentRun.js', () => ({
  PaymentRun: {
    create: mocks.paymentRunCreate
  }
}));

vi.mock('../src/models/PaymentBlock.js', () => ({
  PaymentBlock: {
    create: mocks.paymentBlockCreate
  }
}));

vi.mock('../src/models/PaymentRow.js', () => ({
  PaymentRow: {
    insertMany: mocks.paymentRowInsertMany
  }
}));

describe('Commission Master Rule Resolutions and Calculations', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear?.());
    mocks.settingFindOne.mockResolvedValue({
      companyName: 'SHREE CEMENT LTD.',
      gstRate: 18,
      cgstRate: 9,
      sgstRate: 9,
      defaultRoundingRule: 'round'
    });
    mocks.commissionRuleFind.mockResolvedValue([]);
  });

  it('resolves commission in correct order and creates payment snapshot', async () => {
    const owner = {
      _id: new mongoose.Types.ObjectId(),
      ownerName: 'Owner X',
      normalizedOwnerName: 'OWNER X',
      panNumber: 'ABCDE1234F',
      tdsPercentage: 1,
      commissionType: 'fixed',
      commissionValue: 900,
      status: 'active'
    };

    mocks.ownerMasterFind.mockResolvedValue([owner]);
    mocks.truckMasterFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue({ ownerId: owner })
    }));

    const testRows = [
      {
        _id: new mongoose.Types.ObjectId(),
        approvalStatus: 'approved',
        normalizedRow: {
          truckNo: 'JH10CQ3188',
          truckOwnerName: 'Owner X',
          invDate: new Date('2026-06-30T00:00:00.000Z'),
          qty: 30,
          frtPmt: 1000,
          frtAmt: 30000,
          dieselAmount: 0,
          lessAdvance: 0,
          rfid: 0,
          gps: 0
        },
        transportCompanyId: 'transport-x',
        clientCompanyId: 'client-x',
        plantId: 'plant-x'
      }
    ];

    mocks.loadRowFind.mockResolvedValue(testRows);

    // Case 1: Truck Rule (Owner * Transport * Client * Plant * Truck)
    mocks.commissionRuleFind.mockResolvedValue([
      {
        ownerId: owner._id,
        transportCompanyId: 'transport-x',
        clientCompanyId: 'client-x',
        plantId: 'plant-x',
        truckNumber: 'JH10CQ3188',
        commissionType: 'fixed',
        commissionValue: 1500,
        status: 'active'
      }
    ]);

    let preview = await getPaymentPreview({
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });

    let row = preview.blocks[0].rows[0];
    expect(row.rowValues.comm).toBe(1500);
    expect(row.commissionUsed.source).toBe('Truck Rule');
    expect(row.commissionUsed.type).toBe('fixed');
    expect(row.commissionUsed.value).toBe(1500);
    expect(row.commissionUsed.amount).toBe(1500);

    // Case 2: Default Rule (Owner * Transport * Client * Plant)
    mocks.commissionRuleFind.mockResolvedValue([
      {
        ownerId: owner._id,
        transportCompanyId: 'transport-x',
        clientCompanyId: 'client-x',
        plantId: 'plant-x',
        truckNumber: '',
        commissionType: 'fixed',
        commissionValue: 800,
        status: 'active'
      }
    ]);

    preview = await getPaymentPreview({
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });

    row = preview.blocks[0].rows[0];
    expect(row.rowValues.comm).toBe(800);
    expect(row.commissionUsed.source).toBe('Default Rule');

    // Case 3: Fallback Rule (Owner defaults)
    mocks.commissionRuleFind.mockResolvedValue([]);
    preview = await getPaymentPreview({
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });

    row = preview.blocks[0].rows[0];
    expect(row.rowValues.comm).toBe(900);
    expect(row.commissionUsed.source).toBe('Owner Default');
  });

  it('keeps repeated same truck same date rows visible and sets secondary fixed commission to 0', async () => {
    const owner = {
      _id: new mongoose.Types.ObjectId(),
      ownerName: 'Owner X',
      normalizedOwnerName: 'OWNER X',
      panNumber: 'ABCDE1234F',
      tdsPercentage: 1,
      commissionType: 'fixed',
      commissionValue: 900,
      status: 'active'
    };

    mocks.ownerMasterFind.mockResolvedValue([owner]);
    mocks.truckMasterFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue({ ownerId: owner })
    }));

    const testRows = [
      {
        _id: new mongoose.Types.ObjectId(),
        approvalStatus: 'approved',
        normalizedRow: {
          truckNo: 'JH10CQ3188',
          truckOwnerName: 'Owner X',
          invDate: new Date('2026-06-30T00:00:00.000Z'),
          qty: 30,
          frtPmt: 1000,
          frtAmt: 30000,
          dieselAmount: 1000,
          lessAdvance: 2000,
          rfid: 0,
          gps: 0
        },
        transportCompanyId: 'transport-x',
        clientCompanyId: 'client-x',
        plantId: 'plant-x'
      },
      {
        _id: new mongoose.Types.ObjectId(),
        approvalStatus: 'approved',
        normalizedRow: {
          truckNo: 'JH10CQ3188',
          truckOwnerName: 'Owner X',
          invDate: new Date('2026-06-30T00:00:00.000Z'),
          qty: 25,
          frtPmt: 1000,
          frtAmt: 25000,
          dieselAmount: 500,
          lessAdvance: 1000,
          rfid: 0,
          gps: 0
        },
        transportCompanyId: 'transport-x',
        clientCompanyId: 'client-x',
        plantId: 'plant-x'
      }
    ];

    mocks.loadRowFind.mockResolvedValue(testRows);

    const preview = await getPaymentPreview({
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });

    expect(preview.blocks[0].rows).toHaveLength(2);
    const row1 = preview.blocks[0].rows[0];
    const row2 = preview.blocks[0].rows[1];

    expect(row1.rowValues.comm).toBe(900);
    expect(row1.commissionUsed.source).toBe('Owner Default');
    
    expect(row2.rowValues.comm).toBe(0);
    expect(row2.commissionUsed.source).toBe('Commission Applied Above');
    expect(row2.commissionUsed.amount).toBe(0);
  });
});
