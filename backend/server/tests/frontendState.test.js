import { describe, expect, it } from 'vitest';
import { normalizeTruckNumber, normalizePan } from '../src/helpers/normalize.js';
import { isValidPan, validateOwnerPayload, validateTruckPayload } from '../src/validators/masterData.validator.js';

describe('Frontend & Business Validation Helpers', () => {
  describe('Truck Number Normalization', () => {
    it('forces letters to uppercase', () => {
      expect(normalizeTruckNumber('jh10b1234')).toBe('JH10B1234');
    });

    it('strips all whitespaces', () => {
      expect(normalizeTruckNumber('JH 10 B 1234')).toBe('JH10B1234');
      expect(normalizeTruckNumber('  JH10B1234  ')).toBe('JH10B1234');
    });

    it('returns empty string for empty inputs', () => {
      expect(normalizeTruckNumber('')).toBe('');
      expect(normalizeTruckNumber(null)).toBe('');
    });
  });

  describe('PAN Validation', () => {
    it('identifies valid Indian PAN card formats', () => {
      expect(isValidPan('ABCDE1234F')).toBe(true);
      expect(isValidPan('abcde1234f')).toBe(true); // Should normalize to upper case
    });

    it('identifies invalid formats', () => {
      expect(isValidPan('ABCD1234F')).toBe(false); // short
      expect(isValidPan('ABCDE12345F')).toBe(false); // long
      expect(isValidPan('ABCDE123A')).toBe(false); // wrong digits
      expect(isValidPan('')).toBe(false);
    });
  });

  describe('Owner Payload Validation', () => {
    it('succeeds with valid owner data and default settings', () => {
      const payload = {
        ownerName: 'Sharma Logistics',
        panNumber: 'ABCDE1234F',
        commissionType: 'fixed',
        commissionValue: 900
      };

      const result = validateOwnerPayload(payload);
      expect(result.isValid).toBe(true);
      expect(result.value.normalizedOwnerName).toBe('SHARMA LOGISTICS');
      expect(result.value.tdsPercentage).toBe(0); // Defaults to 0 if empty
    });

    it('validates TDS boundaries', () => {
      const payload = {
        ownerName: 'Sharma Logistics',
        tdsPercentage: 150 // Invalid (> 100)
      };

      const result = validateOwnerPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('TDS percentage must be between 0 and 100');
    });

    it('validates commission values for percentages', () => {
      const payload = {
        ownerName: 'Sharma Logistics',
        commissionType: 'percentage',
        commissionValue: 120 // Invalid (> 100%)
      };

      const result = validateOwnerPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Percentage commission cannot be greater than 100');
    });

    it('accepts context-aware truck-wise commission entries', () => {
      const payload = {
        ownerName: 'Sharma Logistics',
        commissionType: 'truck_wise',
        commissionValue: 0,
        truckWiseCommissionMap: {
          'transport-1|client-1|plant-1|WB60A1234': 1200
        }
      };

      const result = validateOwnerPayload(payload);
      expect(result.isValid).toBe(true);
      expect(result.value.truckWiseCommissionMap['transport-1|client-1|plant-1|WB60A1234']).toBe(1200);
    });
  });

  describe('Truck Payload Validation', () => {
    it('succeeds with valid normalized truck details', () => {
      const payload = {
        truckNumber: 'JH10B-1234',
        ownerId: 'owner-id-123'
      };

      const result = validateTruckPayload(payload);
      expect(result.isValid).toBe(true);
      expect(result.value.truckNumber).toBe('JH10B-1234'); // normalized form
    });

    it('fails if ownerId is missing', () => {
      const payload = {
        truckNumber: 'JH10B1234'
      };

      const result = validateTruckPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Owner reference is required');
    });
  });
});
