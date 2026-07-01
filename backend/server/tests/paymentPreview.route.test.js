import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const mocks = vi.hoisted(() => ({
  previewSpy: vi.fn(async () => ({
    periodStart: new Date('2026-06-01T00:00:00.000Z'),
    periodEnd: new Date('2026-06-30T00:00:00.000Z'),
    totals: {
      totalQty: 0,
      totalAmount: 0,
      totalCommission: 0,
      totalGross: 0,
      totalDiesel: 0,
      totalCashAdvance: 0,
      totalRfidGps: 0,
      totalTds: 0,
      totalGst: 0,
      totalNetPayable: 0
    },
    blocks: [],
    settings: {},
    previewMeta: {
      selectedFilters: {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        transportCompanyId: 'transport-a',
        clientCompanyId: 'client-a',
        plantId: 'plant-a',
        ownerId: null
      },
      matchedRows: 0,
      matchedOwners: 0,
      paymentBlocks: 0,
      message: 'No imported records found for the selected Transport Company, Client Company, Plant and Date Range.'
    }
  }))
}));

vi.mock('../src/services/paymentGeneration.service.js', () => ({
  getPaymentPreview: mocks.previewSpy,
  savePaymentRun: vi.fn(),
  exportPaymentRunExcel: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getMasterPrepSummary: vi.fn()
}));

vi.mock('../src/models/User.js', () => ({
  User: {
    findById: vi.fn()
  }
}));

function authToken() {
  return jwt.sign({ sub: 'user-id-1', role: 'admin' }, process.env.JWT_SECRET);
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  mocks.previewSpy.mockClear();
  User.findById.mockResolvedValue({
    _id: 'user-id-1',
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    isActive: true
  });
});

describe('payment preview route', () => {
  it('forwards all mandatory filters to the preview service', async () => {
    const app = createApp();
    const token = authToken();

    await request(app)
      .get('/api/payments/preview?startDate=2026-06-01&endDate=2026-06-30&transportCompanyId=transport-a&clientCompanyId=client-a&plantId=plant-a')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mocks.previewSpy).toHaveBeenCalledOnce();
    expect(mocks.previewSpy).toHaveBeenCalledWith({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      ownerId: undefined,
      transportCompanyId: 'transport-a',
      clientCompanyId: 'client-a',
      plantId: 'plant-a'
    });
  });

  it('rejects preview requests missing mandatory filters', async () => {
    const app = createApp();
    const token = authToken();

    const response = await request(app)
      .get('/api/payments/preview?startDate=2026-06-01&endDate=2026-06-30')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.message).toContain('transportCompanyId');
    expect(mocks.previewSpy).not.toHaveBeenCalled();
  });
});
