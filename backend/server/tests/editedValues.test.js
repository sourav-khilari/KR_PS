import { describe, expect, it, vi, beforeEach } from 'vitest';
import xlsx from 'xlsx';
import { parseAdditiveAmount } from '../src/services/excelParser.service.js';

// ── parseAdditiveAmount unit tests ──────────────────────────────────────────

describe('parseAdditiveAmount', () => {
  it('parses a plain number', () => {
    expect(parseAdditiveAmount(67)).toBe(67);
  });

  it('parses a string number', () => {
    expect(parseAdditiveAmount('1500')).toBe(1500);
  });

  it('parses an additive expression with +', () => {
    expect(parseAdditiveAmount('12+25')).toBe(37);
  });

  it('parses multi-part additive expression', () => {
    expect(parseAdditiveAmount('100+25+10')).toBe(135);
  });

  it('handles whitespace around +', () => {
    expect(parseAdditiveAmount(' 50 + 30 ')).toBe(80);
  });

  it('returns null for blank', () => {
    expect(parseAdditiveAmount('')).toBeNull();
    expect(parseAdditiveAmount(null)).toBeNull();
    expect(parseAdditiveAmount(undefined)).toBeNull();
  });

  it('parses decimal additive values', () => {
    expect(parseAdditiveAmount('10.5+20.5')).toBe(31);
  });
});

// ── updateImportRow editedValues + diesel tests ─────────────────────────────

const mocks = vi.hoisted(() => ({
  importSessionCreate: vi.fn(async (payload) => ({ _id: 'session-1', ...payload })),
  importSessionFind: vi.fn(),
  importSessionFindById: vi.fn(),
  importSessionFindByIdAndUpdate: vi.fn(async () => ({})),
  loadRowInsertMany: vi.fn(async (rows) => rows.map((row, index) => ({ _id: `row-${index + 1}`, ...row }))),
  loadRowFind: vi.fn(async () => []),
  loadRowFindOne: vi.fn(),
  truckFindOne: vi.fn()
}));

vi.mock('../src/models/MasterImport.js', () => ({
  ImportSession: {
    create: mocks.importSessionCreate,
    find: mocks.importSessionFind,
    findById: mocks.importSessionFindById,
    findByIdAndUpdate: mocks.importSessionFindByIdAndUpdate
  },
  LoadRow: {
    insertMany: mocks.loadRowInsertMany,
    find: mocks.loadRowFind,
    findOne: mocks.loadRowFindOne
  }
}));

vi.mock('../src/models/TruckMaster.js', () => ({
  TruckMaster: {
    findOne: mocks.truckFindOne
  }
}));

vi.mock('../src/models/OwnerMaster.js', () => ({
  OwnerMaster: {
    findOne: vi.fn()
  }
}));

const { updateImportRow } = await import('../src/services/loadImport.service.js');

describe('updateImportRow editedValues and diesel', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear?.());
  });

  it('stores editedValues and parses additive diesel during edit', async () => {
    const fakeRow = {
      _id: 'row-1',
      importSessionId: 'session-1',
      sourceRowNumber: 3,
      normalizedRow: {
        truckNo: 'JH10DB3312',
        truckOwnerName: 'Test Owner',
        panNo: 'ABCDE1234F',
        qty: 30,
        frtPmt: 1400,
        frtAmt: 42000,
        dieselAmount: 0,
        dieselAmountRaw: '0',
        rfidTag: 100,
        gpsInstall: 50,
        rfid: 100,
        gps: 50,
        rfidGps: 150,
        invNo: 'INV-1'
      },
      rawRow: { 'INV NO.': 'INV-1' },
      editedValues: {},
      validationMessages: [],
      editStatus: 'unchanged',
      approvalStatus: 'pending',
      save: vi.fn(async function () { return this; })
    };

    mocks.loadRowFindOne.mockResolvedValue(fakeRow);
    mocks.truckFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue({
        ownerId: { ownerName: 'Test Owner', panNumber: 'ABCDE1234F' }
      })
    }));
    mocks.loadRowFind.mockResolvedValue([fakeRow]);

    const result = await updateImportRow('session-1', 'row-1', {
      normalizedRow: { dieselAmount: '12+25' }
    }, { id: 'user-1' });

    expect(result.normalizedRow.dieselAmount).toBe(37);
    expect(result.normalizedRow.dieselAmountRaw).toBe('12+25');
    expect(result.editedValues.dieselAmount).toBe('12+25');
    expect(result.editStatus).toBe('edited');
    expect(fakeRow.save).toHaveBeenCalled();
  });

  it('recalculates RFID_GPS when rfidTag is edited', async () => {
    const fakeRow = {
      _id: 'row-2',
      importSessionId: 'session-1',
      sourceRowNumber: 4,
      normalizedRow: {
        truckNo: 'MH12AB1234',
        truckOwnerName: 'Owner B',
        panNo: '',
        qty: null,
        frtPmt: null,
        frtAmt: null,
        dieselAmount: null,
        rfidTag: 100,
        gpsInstall: 200,
        rfid: 100,
        gps: 200,
        rfidGps: 300,
        invNo: 'INV-2'
      },
      rawRow: { 'INV NO.': 'INV-2' },
      editedValues: {},
      validationMessages: [],
      editStatus: 'unchanged',
      approvalStatus: 'pending',
      save: vi.fn(async function () { return this; })
    };

    mocks.loadRowFindOne.mockResolvedValue(fakeRow);
    mocks.truckFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue(null)
    }));
    mocks.loadRowFind.mockResolvedValue([fakeRow]);

    const result = await updateImportRow('session-1', 'row-2', {
      normalizedRow: { rfidTag: '500' }
    }, { id: 'user-1' });

    expect(result.normalizedRow.rfidGps).toBe(700);
    expect(result.normalizedRow.RFID_GPS).toBe(700);
    expect(result.editedValues.rfidTag).toBe('500');
  });

  it('preserves rawRow and only tracks changes in editedValues', async () => {
    const fakeRow = {
      _id: 'row-3',
      importSessionId: 'session-1',
      sourceRowNumber: 5,
      normalizedRow: {
        truckNo: 'DL01CD1111',
        truckOwnerName: 'Owner C',
        panNo: 'AAAAA1111A',
        qty: 10,
        frtPmt: 900,
        frtAmt: 9000,
        dieselAmount: null,
        rfidTag: null,
        gpsInstall: null,
        invNo: 'INV-3'
      },
      rawRow: {
        'INV NO.': 'INV-3',
        'TRUCK NO.': 'DL01CD1111',
        'DIESEL AMOUNT': ''
      },
      editedValues: {},
      validationMessages: [],
      editStatus: 'unchanged',
      approvalStatus: 'pending',
      save: vi.fn(async function () { return this; })
    };

    mocks.loadRowFindOne.mockResolvedValue(fakeRow);
    mocks.truckFindOne.mockImplementation(() => ({
      populate: vi.fn().mockResolvedValue(null)
    }));
    mocks.loadRowFind.mockResolvedValue([fakeRow]);

    const result = await updateImportRow('session-1', 'row-3', {
      normalizedRow: { truckOwnerName: 'New Owner' }
    }, { id: 'user-1' });

    // rawRow preserved
    expect(result.rawRow['INV NO.']).toBe('INV-3');
    expect(result.rawRow['TRUCK NO.']).toBe('DL01CD1111');
    // editedValues only has the changed field
    expect(result.editedValues.truckOwnerName).toBe('New Owner');
    expect(result.editedValues.truckNo).toBeUndefined();
  });
});
