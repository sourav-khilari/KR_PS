import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import xlsx from 'xlsx';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

vi.mock('../src/models/User.js', () => ({
  User: {
    findById: vi.fn()
  }
}));

vi.mock('../src/models/MasterImport.js', () => ({
  ImportSession: {
    create: vi.fn(async (payload) => ({ _id: 'session-1', ...payload })),
    find: vi.fn(async () => []),
    findById: vi.fn(async () => ({ _id: 'session-1', fileName: 'master.xlsx' })),
    findByIdAndUpdate: vi.fn(async () => ({}))
  },
  LoadRow: {
    insertMany: vi.fn(async (rows) => rows.map((row, index) => ({ _id: `row-${index + 1}`, ...row }))),
    find: vi.fn(async () => []),
    findOne: vi.fn(),
    updateMany: vi.fn(async () => ({ nModified: 0 }))
  }
}));

vi.mock('../src/models/TruckMaster.js', () => ({
  TruckMaster: {
    findOne: vi.fn(() => ({
      populate: vi.fn().mockResolvedValue({
        ownerId: { ownerName: 'Sharma Logistics', panNumber: 'ABCDE1234F' }
      })
    }))
  }
}));

function sampleExcel() {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([
    ['INV NO.', 'INV DATE.', 'GR/RR NO.', 'DI NO.', "DEPOT/PARTY'S NAME", 'DESTINATION', 'PODUCT NAME', 'TRUCK NO.', 'TRUCK OWNER NAME', 'PAN NO', 'QTY', 'FRT-PMT', 'FRT AMT', 'BILL NO', 'BILL DATE', 'RFID TAG', 'GPS INSTALL', 'LESS: DIESEL(Ltr)', 'DIESEL AMOUNT', 'LESS: ADVANCE', 'UREA', 'BAG SHORTAGE'],
    ['INV-1', 46143, 'GR-1', 'DI-1', 'Party One', 'Purulia', 'Product', 'JH10DB3312', 'Sharma Logistics', 'ABCDE1234F', 30, 1400, 42000, 'B-1', 46144, '', '', '', '', 4500, '', '']
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, 'MAY2026');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function authToken() {
  return jwt.sign({ sub: 'user-id-1', role: 'admin' }, process.env.JWT_SECRET);
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  User.findById.mockResolvedValue({
    _id: 'user-id-1',
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    isActive: true
  });
});

describe('master import API', () => {
  it('requires authentication for protected import routes', async () => {
    await request(createApp())
      .post('/api/master-imports/preview')
      .attach('file', sampleExcel(), 'sample.xlsx')
      .expect(401);
  });

  it('previews rows without storing them', async () => {
    const app = createApp();
    const token = authToken();
    const loadRowModel = await import('../src/models/MasterImport.js');

    const preview = await request(app)
      .post('/api/master-imports/preview')
      .set('Authorization', `Bearer ${token}`)
      .field('transportCompanyId', 'transport-1')
      .field('clientCompanyId', 'client-1')
      .field('plantId', 'plant-1')
      .attach('file', sampleExcel(), 'sample.xlsx')
      .expect(201);

    expect(preview.body.session).toBeDefined();
    expect(preview.body.rows).toHaveLength(1);
    expect(preview.body.rows[0].normalizedRow.truckNo).toBe('JH10DB3312');
    expect(preview.body.rows[0].normalizedRow.qty).toBe(30);
    expect(preview.body.session.transportCompanyId).toBe('transport-1');
    expect(preview.body.session.clientCompanyId).toBe('client-1');
    expect(preview.body.session.plantId).toBe('plant-1');
    expect(loadRowModel.ImportSession.create).not.toHaveBeenCalled();
  });

  it('finalizes a preview into persisted import rows', async () => {
    const app = createApp();
    const token = authToken();

    const preview = await request(app)
      .post('/api/master-imports/preview')
      .set('Authorization', `Bearer ${token}`)
      .field('transportCompanyId', 'transport-1')
      .field('clientCompanyId', 'client-1')
      .field('plantId', 'plant-1')
      .attach('file', sampleExcel(), 'sample.xlsx')
      .expect(201);

    const save = await request(app)
      .post('/api/master-imports/save')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileName: preview.body.session.fileName,
        transportCompanyId: 'transport-1',
        clientCompanyId: 'client-1',
        plantId: 'plant-1',
        sheetNames: preview.body.session.sheetNames,
        rows: preview.body.rows
      })
      .expect(200);

    expect(save.body.session).toBeDefined();
    expect(save.body.rows).toHaveLength(1);
    expect(save.body.session.status).toBe('saved');
  });

  it('lists imported data rows with filtering and pagination', async () => {
    const app = createApp();
    const token = authToken();

    const loadRowModel = await import('../src/models/MasterImport.js');
    loadRowModel.LoadRow.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ _id: 'row-1', normalizedRow: { invNo: 'INV-1', truckNo: 'JH10DB3312' } }])
    });
    loadRowModel.LoadRow.countDocuments = vi.fn().mockResolvedValue(1);

    const response = await request(app)
      .get('/api/imported-data?page=1&limit=5&invoiceNumber=INV-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.pagination.total).toBe(1);
  });

  it('skips duplicate invoice numbers from being inserted again', async () => {
    const app = createApp();
    const token = authToken();

    const loadRowModel = await import('../src/models/MasterImport.js');
    loadRowModel.LoadRow.find.mockResolvedValue([{ normalizedRow: { invNo: 'INV-1' } }]);

    const preview = await request(app)
      .post('/api/master-imports/preview')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', sampleExcel(), 'sample.xlsx')
      .expect(201);

    expect(preview.body.rows).toHaveLength(1);
    expect(preview.body.summary.errorCount).toBeGreaterThan(0);
    expect(preview.body.messages.some((message) => message.message.includes('already exists'))).toBe(true);
  });

  it('deletes an imported row through the import session route', async () => {
    const app = createApp();
    const token = authToken();

    const loadRowModel = await import('../src/models/MasterImport.js');
    loadRowModel.LoadRow.findOne.mockResolvedValue({
      _id: 'row-1',
      importSessionId: 'session-1',
      deleteOne: vi.fn().mockResolvedValue({})
    });

    const response = await request(app)
      .delete('/api/master-imports/session-1/rows/row-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.deleted).toBe(true);
    expect(response.body.rowId).toBe('row-1');
  });
});
