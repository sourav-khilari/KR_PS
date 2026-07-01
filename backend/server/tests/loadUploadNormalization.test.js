import { describe, expect, it } from 'vitest';
import { normalizeLoadUploadRow, rowToRawPreview } from '../src/helpers/loadUploadNormalization.js';

describe('normalizeLoadUploadRow', () => {
  it('keeps blanks as blanks or null and normalizes present values', () => {
    const normalized = normalizeLoadUploadRow({
      'INV NO.': '  INV-1 ',
      'INV DATE.': 46143,
      'GR/RR NO.': '',
      'DI NO.': null,
      "DEPOT/PARTY'S NAME": ' Party One ',
      DESTINATION: '  Purulia ',
      'PODUCT NAME': ' Product ',
      'TRUCK NO.': ' jh10 db 3312 ',
      'TRUCK OWNER NAME': ' Sharma Logistics ',
      'PAN NO': ' abefb6995q ',
      QTY: '30',
      'FRT-PMT': '1400',
      'FRT AMT': '42000',
      'LESS: DIESEL(Ltr)': '',
      'DIESEL AMOUNT': '',
      'LESS: ADVANCE': '4500',
      UREA: '',
      'BAG SHORTAGE': ''
    });

    expect(normalized.invNo).toBe('INV-1');
    expect(normalized.grRrNo).toBe('');
    expect(normalized.diNo).toBeNull();
    expect(normalized.truckNo).toBe('JH10DB3312');
    expect(normalized.panNo).toBe('ABEFB6995Q');
    expect(normalized.qty).toBe(30);
    expect(normalized.frtAmt).toBe(42000);
    expect(normalized.lessDieselLtr).toBeNull();
    expect(normalized.urea).toBeNull();
  });

  it('preserves raw preview values for editing', () => {
    const rawPreview = rowToRawPreview({ A: null, B: 123, C: '' });
    expect(rawPreview).toEqual({ A: '', B: 123, C: '' });
  });
});
