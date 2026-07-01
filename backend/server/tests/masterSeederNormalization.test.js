import { describe, expect, it } from 'vitest';
import {
  hasMeaningfulValue,
  isValidSeederPan,
  normalizeSeederOwnerKey,
  normalizeSeederOwnerName,
  normalizeSeederPan,
  normalizeSeederTruckNumber
} from '../src/helpers/masterSeederNormalization.js';

describe('master seeder normalization', () => {
  it('normalizes truck, owner, and PAN values', () => {
    expect(normalizeSeederTruckNumber(' jh10 db 3312 ')).toBe('JH10DB3312');
    expect(normalizeSeederOwnerName('  P K  SINGH ')).toBe('P K SINGH');
    expect(normalizeSeederOwnerKey('  P K  SINGH ')).toBe('P K SINGH');
    expect(normalizeSeederPan(' abefb6995q ')).toBe('ABEFB6995Q');
  });

  it('validates PAN format and meaningful values', () => {
    expect(isValidSeederPan('ABEFB6995Q')).toBe(true);
    expect(isValidSeederPan('invalid-pan')).toBe(false);
    expect(hasMeaningfulValue('   ')).toBe(false);
    expect(hasMeaningfulValue('value')).toBe(true);
  });
});
