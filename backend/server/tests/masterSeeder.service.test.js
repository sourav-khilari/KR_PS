import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ownerCreate: vi.fn(async (payload) => ({ _id: `owner-${payload.panNumber}`, ...payload })),
  ownerFindOne: vi.fn(async () => null),
  truckCreate: vi.fn(async (payload) => ({ _id: `truck-${payload.truckNumber}`, ...payload })),
  truckFindOne: vi.fn(async () => null),
  seedRunCreate: vi.fn(async (payload) => ({ _id: 'seed-run-id', ...payload }))
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(async () => Buffer.from('mock')),
    mkdir: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => undefined)
  }
}));

vi.mock('../src/excel/masterSeederWorkbook.js', () => ({
  parseTrustedSeederWorkbook: vi.fn((buffer, fileName) => {
    if (fileName.includes('LOAD')) {
      return {
        workbookSheetCount: 1,
        sheetSummaries: [{ sheetName: 'MAY2026', parserType: 'load-details', status: 'parsed' }],
        rows: [
          {
            sourceFileName: fileName,
            sourceSheetName: 'MAY2026',
            sourceRowNumber: 3,
            sourceType: 'load',
            truckNumber: 'JH10DB3312',
            ownerName: 'P K SINGH',
            ownerPan: 'ABCDE1234F'
          }
        ]
      };
    }

    return {
      workbookSheetCount: 1,
      sheetSummaries: [{ sheetName: '01.06.26 to 15.06.26', parserType: 'payment-sheet', status: 'parsed' }],
      rows: [
        {
          sourceFileName: fileName,
          sourceSheetName: '01.06.26 to 15.06.26',
          sourceRowNumber: 6,
          sourceType: 'payment',
          truckNumber: 'JH10DC8969',
          ownerName: 'Balaji Transportation & Logistics',
          ownerPan: 'ABEFB6995Q'
        }
      ]
    };
  })
}));

const ownerCreate = vi.fn(async (payload) => ({ _id: `owner-${payload.panNumber}`, ...payload }));
const ownerFindOne = vi.fn(async () => null);
const ownerSave = vi.fn(async function save() { return this; });
const truckCreate = vi.fn(async (payload) => ({ _id: `truck-${payload.truckNumber}`, ...payload }));
const truckFindOne = vi.fn(async () => null);
const truckSave = vi.fn(async function save() { return this; });
const seedRunCreate = vi.fn(async (payload) => ({ _id: 'seed-run-id', ...payload }));

vi.mock('../src/models/OwnerMaster.js', () => ({
  OwnerMaster: {
    findOne: mocks.ownerFindOne,
    create: mocks.ownerCreate
  }
}));

vi.mock('../src/models/TruckMaster.js', () => ({
  TruckMaster: {
    findOne: mocks.truckFindOne,
    create: mocks.truckCreate
  }
}));

vi.mock('../src/models/MasterSeedRun.js', () => ({
  MasterSeedRun: {
    create: mocks.seedRunCreate
  }
}));

vi.mock('../src/services/masterSeedReport.service.js', () => ({
  buildMasterSeedReport: vi.fn((payload) => payload)
}));

const { seedTrustedMasterData } = await import('../src/services/masterSeeder.service.js');

describe('seedTrustedMasterData', () => {
  beforeEach(() => {
    mocks.ownerCreate.mockClear();
    mocks.ownerFindOne.mockClear();
    mocks.truckCreate.mockClear();
    mocks.truckFindOne.mockClear();
    mocks.seedRunCreate.mockClear();
  });

  it('uses the payment workbook only for owner enrichment, not truck creation', async () => {
    const result = await seedTrustedMasterData({
      sourceFiles: [
        'c:/work/PURULIA TRUCK LOAD DETAILS (2026-27).xlsx',
        'c:/work/SHREE PURULIA PAYMENT (2026-27).xlsx'
      ],
      createdBy: 'master-seeder'
    });

    expect(mocks.ownerCreate).toHaveBeenCalledTimes(2);
    expect(mocks.truckCreate).toHaveBeenCalledOnce();
    expect(mocks.truckCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        truckNumber: 'JH10DB3312',
        ownerId: 'owner-ABCDE1234F'
      })
    );
    expect(result.summary.createdTrucks).toBe(1);
    expect(result.summary.createdOwners).toBe(2);
  });
});
