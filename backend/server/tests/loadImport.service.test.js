import { beforeEach, describe, expect, it, vi } from 'vitest';
import xlsx from 'xlsx';

const mocks = vi.hoisted(() => ({
  importSessionCreate: vi.fn(async (payload) => ({ _id: 'session-1', ...payload })),
  importSessionFind: vi.fn(),
  importSessionFindById: vi.fn(),
  importSessionFindByIdAndUpdate: vi.fn(async () => ({})),
  loadRowInsertMany: vi.fn(async (rows) => rows.map((row, index) => ({ _id: `row-${index + 1}`, ...row }))),
  loadRowFind: vi.fn(),
  loadRowFindOne: vi.fn(),
  truckFindOne: vi.fn(),
  ownerPopulate: vi.fn()
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

const { parseLoadWorkbook, previewLoadImport } = await import('../src/services/loadImport.service.js');

function buildWorkbook() {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([
    ['Title row', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [
      'INV NO.', 'INV DATE.', 'GR/RR NO.', 'DI NO.', "DEPOT/PARTY'S NAME", 'DESTINATION', 'PODUCT NAME',
      'TRUCK NO.', 'TRUCK OWNER NAME', 'PAN NO', 'QTY', 'FRT-PMT', 'FRT AMT', 'BILL NO', 'BILL DATE',
      'RFID TAG', 'GPS INSTALL', 'LESS: DIESEL(Ltr)', 'DIESEL AMOUNT', 'LESS: ADVANCE', 'UREA', 'BAG SHORTAGE'
    ],
    ['INV-1', 46143, 'GR-1', 'DI-1', 'Party One', 'Purulia', 'Product', 'JH10DB3312', 'Sharma Logistics', 'ABCDE1234F', 30, 1400, 42000, 'B-1', 46144, '', '', '', '', 4500, '', ''],
    ['INV-2', '', '', '', 'Party Two', 'Dhanbad', 'Product', 'KA01AA9999', 'Missing Owner', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, 'MAY2026');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('load import service', () => {
  beforeEach(() => {
    mocks.importSessionCreate.mockClear();
    mocks.importSessionFind.mockClear();
    mocks.importSessionFindById.mockClear();
    mocks.importSessionFindByIdAndUpdate.mockClear();
    mocks.loadRowInsertMany.mockClear();
    mocks.loadRowFind.mockClear();
    mocks.loadRowFindOne.mockClear();
    mocks.truckFindOne.mockClear();
  });

  it('parses every upload column and keeps blanks', () => {
    const parsed = parseLoadWorkbook(buildWorkbook());

    expect(parsed.workbookSheetCount).toBe(1);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].rawRow['INV NO.']).toBe('INV-1');
    expect(parsed.rows[0].rawRow['GPS INSTALL']).toBe('');
    expect(parsed.rows[0].normalizedRow.truckNo).toBe('JH10DB3312');
    expect(parsed.rows[1].normalizedRow.truckNo).toBe('KA01AA9999');
  });

  it('creates a session and validates rows against seeded masters', async () => {
    mocks.truckFindOne.mockImplementation((query) => ({
      populate: vi.fn().mockResolvedValue(
        query.normalizedTruckNumber === 'JH10DB3312'
          ? { ownerId: { ownerName: 'Sharma Logistics', panNumber: 'ABCDE1234F' } }
          : null
      )
    }));

    const result = await previewLoadImport({
      fileBuffer: buildWorkbook(),
      fileName: 'master.xlsx',
      uploadedBy: 'user-1',
      createdBy: 'user-1',
      updatedBy: 'user-1'
    });

    expect(mocks.importSessionCreate).toHaveBeenCalledOnce();
    expect(mocks.loadRowInsertMany).toHaveBeenCalledOnce();
    expect(result.session.fileName).toBe('master.xlsx');
    expect(result.rows).toHaveLength(2);
    expect(result.summary.warningCount).toBeGreaterThan(0);
    expect(result.messages.some((item) => item.field === 'truckNo')).toBe(true);
  });
});

