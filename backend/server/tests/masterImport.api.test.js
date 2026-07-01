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
    findOne: vi.fn()
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

function authToken() {
  return jwt.sign({ sub: 'user-id-1', role: 'admin' }, process.env.JWT_SECRET);
}

function sampleExcel() {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.aoa_to_sheet([
    ['INV NO.', 'INV DATE.', 'GR/RR NO.', 'DI NO.', "DEPOT/PARTY'S NAME", 'DESTINATION', 'PODUCT NAME', 'TRUCK NO.', 'TRUCK OWNER NAME', 'PAN NO', 'QTY', 'FRT-PMT', 'FRT AMT', 'BILL NO', 'BILL DATE', 'RFID TAG', 'GPS INSTALL', 'LESS: DIESEL(Ltr)', 'DIESEL AMOUNT', 'LESS: ADVANCE', 'UREA', 'BAG SHORTAGE'],
    ['INV-1', 46143, 'GR-1', 'DI-1', 'Party One', 'Purulia', 'Product', 'JH10DB3312', 'Sharma Logistics', 'ABCDE1234F', 30, 1400, 42000, 'B-1', 46144, '', '', '', '', 4500, '', '']
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, 'MAY2026');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
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

  it('previews and stores the import session', async () => {
    const app = createApp();
    const token = authToken();

    const preview = await request(app)
      .post('/api/master-imports/preview')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', sampleExcel(), 'sample.xlsx')
      .expect(201);

    expect(preview.body.session).toBeDefined();
    expect(preview.body.rows).toHaveLength(1);
    expect(preview.body.rows[0].normalizedRow.truckNo).toBe('JH10DB3312');
  });
});
