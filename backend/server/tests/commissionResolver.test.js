import { describe, expect, it } from 'vitest';
import { resolveCommissionForRow } from '../src/services/commissionResolver.service.js';

const context = {
  transportCompanyId: 'transport-1',
  clientCompanyId: 'client-1',
  plantId: 'plant-1',
  normalizedRow: { truckNo: ' jh10 de 2279 ', frtAmt: 40000 }
};

function owner(overrides = {}) {
  return {
    _id: 'owner-1',
    ownerName: 'Balaji Transportation & Logistics',
    commissionType: 'fixed',
    commissionValue: 500,
    truckWiseCommissionMap: {},
    ...overrides
  };
}

function rule(overrides = {}) {
  return {
    _id: 'rule-1',
    ownerId: 'owner-1',
    transportCompanyId: 'transport-1',
    clientCompanyId: 'client-1',
    plantId: 'plant-1',
    truckNumber: '',
    commissionType: 'fixed',
    commissionValue: 700,
    ...overrides
  };
}

describe('commission resolver', () => {
  it('resolves an Owner Master truck-wise rule with normalized truck number', () => {
    const result = resolveCommissionForRow({
      owner: owner({
        commissionType: 'truck_wise',
        commissionValue: 0,
        truckWiseCommissionMap: {
          'transport-1|client-1|plant-1|JH10DE2279': 900
        }
      }),
      sourceRow: context
    });

    expect(result).toMatchObject({ type: 'fixed', value: 900, amount: 900, source: 'Truck Rule' });
    expect(result.matchedRuleId).toContain('owner-map:');
  });

  it('prefers a truck-specific collection rule over defaults', () => {
    const result = resolveCommissionForRow({
      owner: owner(),
      sourceRow: context,
      activeRules: [
        rule({ commissionType: 'percentage', commissionValue: 2 }),
        rule({ _id: 'truck-rule', truckNumber: 'JH10DE2279', commissionValue: 800 })
      ]
    });
    expect(result).toMatchObject({ amount: 800, source: 'Truck Rule', matchedRuleId: 'truck-rule' });
  });

  it('prefers a percentage scope default over a fixed scope default', () => {
    const result = resolveCommissionForRow({
      owner: owner(),
      sourceRow: context,
      activeRules: [rule({ commissionValue: 800 }), rule({ _id: 'percent', commissionType: 'percentage', commissionValue: 2 })]
    });
    expect(result).toMatchObject({ type: 'percentage', value: 2, amount: 800, source: 'Default Rule' });
  });

  it('falls back to the owner default and then explicit zero when no rule exists', () => {
    const fallback = resolveCommissionForRow({ owner: owner(), sourceRow: context });
    expect(fallback).toMatchObject({ amount: 500, source: 'Owner Default' });

    const zero = resolveCommissionForRow({
      owner: owner({ commissionType: 'truck_wise', commissionValue: 0 }),
      sourceRow: context
    });
    expect(zero).toMatchObject({ amount: 0, source: 'No Rule' });
  });

  it('applies fixed commission to the first repeated row only', () => {
    const args = {
      owner: owner(),
      sourceRow: context,
      repeatedTrip: true
    };
    expect(resolveCommissionForRow({ ...args, repeatedTripIndex: 0 }).amount).toBe(500);
    expect(resolveCommissionForRow({ ...args, repeatedTripIndex: 1 })).toMatchObject({
      amount: 0,
      source: 'Commission Applied Above'
    });
  });

  it('applies percentage commission independently to repeated rows', () => {
    const result = resolveCommissionForRow({
      owner: owner({ commissionType: 'percentage', commissionValue: 2 }),
      sourceRow: context,
      repeatedTrip: true,
      repeatedTripIndex: 1
    });
    expect(result.amount).toBe(800);
  });
});
