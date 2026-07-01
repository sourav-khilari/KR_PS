import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { OwnerMaster } from '../src/models/OwnerMaster.js';
import { TruckMaster } from '../src/models/TruckMaster.js';

vi.mock('../src/models/User.js', () => ({
  User: {
    findById: vi.fn()
  }
}));

const mocks = vi.hoisted(() => ({
  ownerFind: vi.fn(),
  ownerFindById: vi.fn(),
  ownerFindOne: vi.fn(),
  ownerCreate: vi.fn(),
  ownerCountDocuments: vi.fn(),
  
  truckFind: vi.fn(),
  truckFindById: vi.fn(),
  truckFindOne: vi.fn(),
  truckCreate: vi.fn(),
  truckCountDocuments: vi.fn()
}));

vi.mock('../src/models/OwnerMaster.js', () => ({
  OwnerMaster: {
    find: mocks.ownerFind,
    findById: mocks.ownerFindById,
    findOne: mocks.ownerFindOne,
    create: mocks.ownerCreate,
    countDocuments: mocks.ownerCountDocuments
  }
}));

vi.mock('../src/models/TruckMaster.js', () => ({
  TruckMaster: {
    find: mocks.truckFind,
    findById: mocks.truckFindById,
    findOne: mocks.truckFindOne,
    create: mocks.truckCreate,
    countDocuments: mocks.truckCountDocuments
  }
}));

function authToken() {
  return jwt.sign({ sub: 'user-id-1', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  vi.clearAllMocks();
  User.findById.mockResolvedValue({
    _id: 'user-id-1',
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    isActive: true
  });
});

describe('Master Management APIs', () => {
  describe('Owner CRUD APIs', () => {
    it('lists owners with search and pagination', async () => {
      const mockOwners = [
        { _id: 'owner-1', ownerName: 'Owner One', panNumber: 'ABCDE1234F', tdsPercentage: 1, commissionType: 'fixed', commissionValue: 900, status: 'active' },
        { _id: 'owner-2', ownerName: 'Owner Two', panNumber: 'FGHIJ5678K', tdsPercentage: 2, commissionType: 'percentage', commissionValue: 5, status: 'active' }
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockOwners)
      };
      mocks.ownerFind.mockReturnValue(mockQuery);
      mocks.ownerCountDocuments.mockResolvedValue(2);

      const response = await request(createApp())
        .get('/api/owners?page=1&limit=10&q=Owner')
        .set('Authorization', `Bearer ${authToken()}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      expect(mocks.ownerFind).toHaveBeenCalled();
    });

    it('creates a new owner after validating payload and PAN uniqueness', async () => {
      const payload = {
        ownerName: 'New Owner',
        panNumber: 'ABCDE1234F',
        tdsPercentage: 1,
        commissionType: 'fixed',
        commissionValue: 900
      };

      mocks.ownerFindOne.mockResolvedValue(null); // PAN is unique
      mocks.ownerCreate.mockResolvedValue({ _id: 'new-owner-id', ...payload });

      const response = await request(createApp())
        .post('/api/owners')
        .set('Authorization', `Bearer ${authToken()}`)
        .send(payload)
        .expect(201);

      expect(response.body._id).toBe('new-owner-id');
      expect(response.body.ownerName).toBe('New Owner');
      expect(mocks.ownerCreate).toHaveBeenCalled();
    });

    it('updates owner properties including commission map', async () => {
      const existingOwner = {
        _id: 'owner-1',
        ownerName: 'Owner One',
        panNumber: 'ABCDE1234F',
        tdsPercentage: 1,
        commissionType: 'fixed',
        commissionValue: 900,
        status: 'active',
        save: vi.fn().mockResolvedValue(true)
      };

      mocks.ownerFindById.mockResolvedValue(existingOwner);
      mocks.ownerFindOne.mockResolvedValue(null); // PAN unique check passes

      const response = await request(createApp())
        .patch('/api/owners/owner-1')
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ commissionType: 'truck_wise', truckWiseCommissionMap: { 'JH10B1234': 800 } })
        .expect(200);

      expect(existingOwner.save).toHaveBeenCalled();
    });

    it('sets an owner inactive when deleted', async () => {
      const existingOwner = {
        _id: 'owner-1',
        ownerName: 'Owner One',
        panNumber: 'ABCDE1234F',
        status: 'active',
        save: vi.fn().mockResolvedValue(true)
      };

      mocks.ownerFindById.mockResolvedValue(existingOwner);
      mocks.ownerFindOne.mockResolvedValue(null);

      const response = await request(createApp())
        .delete('/api/owners/owner-1')
        .set('Authorization', `Bearer ${authToken()}`)
        .expect(200);

      expect(existingOwner.status).toBe('inactive');
      expect(existingOwner.save).toHaveBeenCalled();
    });

    it('allows saving an owner with a blank PAN without duplicate validation', async () => {
      mocks.ownerFindOne.mockImplementation(() => {
        throw new Error('duplicate validation should be skipped');
      });
      mocks.ownerCreate.mockResolvedValue({ _id: 'new-owner-id', ownerName: 'Blank PAN Owner', panNumber: '' });

      const response = await request(createApp())
        .post('/api/owners')
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ ownerName: 'Blank PAN Owner', panNumber: '', tdsPercentage: 1, commissionType: 'fixed', commissionValue: 900 })
        .expect(201);

      expect(response.body._id).toBe('new-owner-id');
      expect(mocks.ownerCreate).toHaveBeenCalled();
    });
  });

  describe('Truck CRUD APIs', () => {
    it('lists trucks populated with owner info', async () => {
      const mockTrucks = [
        { _id: 'truck-1', truckNumber: 'JH10B1234', normalizedTruckNumber: 'JH10B1234', ownerId: { _id: 'owner-1', ownerName: 'Owner One' }, status: 'active' }
      ];

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockTrucks)
      };

      mocks.truckFind.mockReturnValue(mockQuery);
      mocks.truckCountDocuments.mockResolvedValue(1);

      const response = await request(createApp())
        .get('/api/trucks')
        .set('Authorization', `Bearer ${authToken()}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].truckNumber).toBe('JH10B1234');
    });

    it('creates a truck and validates owner reference and duplicates', async () => {
      const payload = {
        truckNumber: 'JH10B9999',
        ownerId: 'owner-1',
        status: 'active'
      };

      mocks.ownerFindById.mockResolvedValue({ _id: 'owner-1', ownerName: 'Owner One' });
      mocks.truckFindOne.mockResolvedValue(null); // No active duplicate
      mocks.truckCreate.mockResolvedValue({ _id: 'truck-new-id', ...payload, normalizedTruckNumber: 'JH10B9999' });

      const response = await request(createApp())
        .post('/api/trucks')
        .set('Authorization', `Bearer ${authToken()}`)
        .send(payload)
        .expect(201);

      expect(response.body._id).toBe('truck-new-id');
      expect(response.body.normalizedTruckNumber).toBe('JH10B9999');
    });
  });

  describe('Payment Prep Summary API', () => {
    it('calculates the correct preparation statistics and warnings', async () => {
      const mockOwners = [
        { _id: 'owner-1', ownerName: 'Owner One', panNumber: '', tdsPercentage: 1, commissionType: 'fixed', commissionValue: 900, status: 'active', updatedAt: new Date() },
        { _id: 'owner-2', ownerName: 'Owner Two', panNumber: 'FGHIJ5678K', tdsPercentage: 0, commissionType: 'percentage', commissionValue: 0, status: 'active', updatedAt: new Date() }
      ];

      const mockTrucks = [
        { _id: 'truck-1', truckNumber: 'JH10B1234', normalizedTruckNumber: 'JH10B1234', ownerId: mockOwners[0], status: 'active', updatedAt: new Date() },
        { _id: 'truck-2', truckNumber: 'JH10B5678', normalizedTruckNumber: 'JH10B5678', ownerId: null, status: 'active', updatedAt: new Date() }
      ];

      mocks.ownerFind.mockResolvedValue(mockOwners);
      mocks.truckFind.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockTrucks)
      });

      const response = await request(createApp())
        .get('/api/payments/master-prep-summary')
        .set('Authorization', `Bearer ${authToken()}`)
        .expect(200);

      expect(response.body.stats.totalOwners).toBe(2);
      expect(response.body.stats.ownersMissingPan).toBe(1); // owner-1 has empty PAN
      expect(response.body.stats.ownersMissingTds).toBe(1); // owner-2 has 0 TDS
      expect(response.body.stats.ownersMissingCommission).toBe(1); // owner-2 has 0 commission
      expect(response.body.stats.trucksWithoutOwner).toBe(1); // truck-2 has no owner
    });
  });
});
