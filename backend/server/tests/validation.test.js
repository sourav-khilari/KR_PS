import { describe, expect, it } from 'vitest';
import { validateMasterRows } from '../src/services/validation.service.js';

describe('validateMasterRows', () => {
  it('marks missing required values and suspicious PAN values', () => {
    const result = validateMasterRows([
      { rowNumber: 2, truckNo: '', ownerName: 'Owner One', ownerPan: 'BAD' }
    ]);

    expect(result.status).toBe('errors');
    expect(result.messages.map((item) => item.field)).toContain('truckNo');
    expect(result.messages.map((item) => item.field)).toContain('ownerPan');
  });

  it('warns when the same truck has a different owner', () => {
    const result = validateMasterRows([
      { rowNumber: 2, truckNo: 'MH12AB1234', ownerName: 'Owner One', ownerPan: 'ABCDE1234F' },
      { rowNumber: 3, truckNo: 'MH12AB1234', ownerName: 'Owner Two', ownerPan: 'ABCDE1234F' }
    ]);

    expect(result.status).toBe('warnings');
    expect(result.messages[0].message).toContain('different owner');
  });
});
