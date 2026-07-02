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

const { finalizeImportSession, parseLoadWorkbook, previewLoadImport } = await import('../src/services/loadImport.service.js');

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

  it('previews rows without persisting them', async () => {
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

    expect(mocks.importSessionCreate).not.toHaveBeenCalled();
    expect(mocks.loadRowInsertMany).not.toHaveBeenCalled();
    expect(result.session.fileName).toBe('master.xlsx');
    expect(result.session.status).toBe('previewed');
    expect(result.rows).toHaveLength(2);
    expect(result.summary.warningCount).toBeGreaterThan(0);
    expect(result.messages.some((item) => item.field === 'truckNo')).toBe(true);
  });

  it('finalizes only validated rows after duplicate validation passes', async () => {
    mocks.truckFindOne.mockImplementation((query) => ({
      populate: vi.fn().mockResolvedValue(
        query.normalizedTruckNumber === 'JH10DB3312'
          ? { ownerId: { ownerName: 'Sharma Logistics', panNumber: 'ABCDE1234F' } }
          : null
      )
    }));
    mocks.loadRowFind.mockResolvedValue([]);

    const preview = await previewLoadImport({
      fileBuffer: buildWorkbook(),
      fileName: 'master.xlsx',
      uploadedBy: 'user-1',
      createdBy: 'user-1',
      updatedBy: 'user-1'
    });

    const validRows = preview.rows.filter((row) => !(row.validationMessages || []).some((item) => item.severity === 'error'));

    const saved = await finalizeImportSession(
      {
        fileName: preview.session.fileName,
        transportCompanyId: 'transport-1',
        clientCompanyId: 'client-1',
        plantId: 'plant-1',
        sheetNames: preview.session.sheetNames,
        rows: validRows
      },
      { id: 'user-1' }
    );

    expect(mocks.importSessionCreate).toHaveBeenCalledOnce();
    expect(mocks.loadRowInsertMany).toHaveBeenCalledOnce();
    expect(saved.session.status).toBe('saved');
    expect(saved.rows).toHaveLength(1);
    expect(mocks.loadRowInsertMany.mock.calls[0][0][0].transportCompanyId).toBe('transport-1');
    expect(mocks.loadRowInsertMany.mock.calls[0][0][0].clientCompanyId).toBe('client-1');
    expect(mocks.loadRowInsertMany.mock.calls[0][0][0].plantId).toBe('plant-1');
  });

  it('revalidates preview rows and ignores stale duplicate validation errors before save', async () => {
    mocks.truckFindOne.mockImplementation((query) => ({
      populate: vi.fn().mockResolvedValue(
        query.normalizedTruckNumber === 'JH10DB3312'
          ? { ownerId: { ownerName: 'Sharma Logistics', panNumber: 'ABCDE1234F' } }
          : null
      )
    }));
    mocks.loadRowFind.mockResolvedValue([]);

    const preview = await previewLoadImport({
      fileBuffer: buildWorkbook(),
      fileName: 'master.xlsx',
      uploadedBy: 'user-1',
      createdBy: 'user-1',
      updatedBy: 'user-1'
    });

    const staleRow = {
      ...preview.rows[0],
      validationMessages: [
        {
          rowNumber: preview.rows[0].rowNumber,
          field: 'invNo',
          severity: 'error',
          message: 'Invoice number INV-1 already exists in the database and will not be inserted'
        }
      ]
    };

    const saved = await finalizeImportSession(
      {
        fileName: preview.session.fileName,
        transportCompanyId: 'transport-1',
        clientCompanyId: 'client-1',
        plantId: 'plant-1',
        sheetNames: preview.session.sheetNames,
        rows: [staleRow]
      },
      { id: 'user-1' }
    );

    expect(saved.rows).toHaveLength(1);
    expect(mocks.loadRowInsertMany).toHaveBeenCalled();
  });

  it('stores saved row invDate as a Date when finalizing import', async () => {
    mocks.truckFindOne.mockImplementation((query) => ({
      populate: vi.fn().mockResolvedValue(
        query.normalizedTruckNumber === 'JH10DB3312'
          ? { ownerId: { ownerName: 'Sharma Logistics', panNumber: 'ABCDE1234F' } }
          : null
      )
    }));
    mocks.loadRowFind.mockResolvedValue([]);

    const preview = await previewLoadImport({
      fileBuffer: buildWorkbook(),
      fileName: 'master.xlsx',
      uploadedBy: 'user-1',
      createdBy: 'user-1',
      updatedBy: 'user-1'
    });

    const validRows = preview.rows.filter((row) => !(row.validationMessages || []).some((item) => item.severity === 'error'));

    await finalizeImportSession(
      {
        fileName: preview.session.fileName,
        transportCompanyId: 'transport-1',
        clientCompanyId: 'client-1',
        plantId: 'plant-1',
        sheetNames: preview.session.sheetNames,
        rows: validRows
      },
      { id: 'user-1' }
    );

    const savedRow = mocks.loadRowInsertMany.mock.calls[0][0][0];
    expect(savedRow.normalizedRow.invDate).toBeInstanceOf(Date);
  });

  it('rejects finalize when duplicate invoice numbers exist before save', async () => {
    mocks.truckFindOne.mockImplementation((query) => ({
      populate: vi.fn().mockResolvedValue(
        query.normalizedTruckNumber === 'JH10DB3312'
          ? { ownerId: { ownerName: 'Sharma Logistics', panNumber: 'ABCDE1234F' } }
          : null
      )
    }));
    mocks.loadRowFind.mockResolvedValue([{ normalizedRow: { invNo: 'INV-1' } }]);

    const preview = await previewLoadImport({
      fileBuffer: buildWorkbook(),
      fileName: 'master.xlsx',
      uploadedBy: 'user-1',
      createdBy: 'user-1',
      updatedBy: 'user-1'
    });

    const validRows = preview.rows.filter((row) => !(row.validationMessages || []).some((item) => item.severity === 'error'));

    await expect(
      finalizeImportSession(
        {
          fileName: preview.session.fileName,
          transportCompanyId: 'transport-1',
          clientCompanyId: 'client-1',
          plantId: 'plant-1',
          sheetNames: preview.session.sheetNames,
          rows: validRows
        },
        { id: 'user-1' }
      )
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mocks.importSessionCreate).not.toHaveBeenCalled();
    expect(mocks.loadRowInsertMany).not.toHaveBeenCalled();
  });

  it('rejects finalize with validation errors but does not show duplicate invoice message unless invoice is actually duplicate', async () => {
    mocks.truckFindOne.mockImplementation((query) => ({
      populate: vi.fn().mockResolvedValue(
        query.normalizedTruckNumber === 'JH10DB3312'
          ? { ownerId: { ownerName: 'Sharma Logistics', panNumber: 'ABCDE1234F' } }
          : null
      )
    }));
    mocks.loadRowFind.mockResolvedValue([]);

    const preview = await previewLoadImport({
      fileBuffer: buildWorkbook(),
      fileName: 'master.xlsx',
      uploadedBy: 'user-1',
      createdBy: 'user-1',
      updatedBy: 'user-1'
    });

    const rowsWithErrors = preview.rows.filter((row) => (row.validationMessages || []).some((item) => item.severity === 'error'));

    await expect(
      finalizeImportSession(
        {
          fileName: preview.session.fileName,
          transportCompanyId: 'transport-1',
          clientCompanyId: 'client-1',
          plantId: 'plant-1',
          sheetNames: preview.session.sheetNames,
          rows: rowsWithErrors
        },
        { id: 'user-1' }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      message: /^Validation errors found in row\(s\) \d+: /,
      details: {
        invalidRows: expect.any(Array)
      }
    });

    expect(mocks.importSessionCreate).not.toHaveBeenCalled();
    expect(mocks.loadRowInsertMany).not.toHaveBeenCalled();
  });
});

