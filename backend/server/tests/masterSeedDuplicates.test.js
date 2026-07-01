import { describe, expect, it } from 'vitest';
import {
  areEquivalentOwnerRecords,
  areEquivalentTruckRecords,
  groupPreferredByKey,
  preferSeedRecord
} from '../src/helpers/masterSeedDuplicates.js';

describe('master seed duplicate helpers', () => {
  it('prefers richer source records', () => {
    const current = { ownerName: 'A', ownerPan: '', truckNumber: 'JH10DB3312', sourceType: 'load' };
    const incoming = { ownerName: 'Longer Owner Name', ownerPan: 'ABCDE1234F', truckNumber: 'JH10DB3312', sourceType: 'payment' };

    expect(preferSeedRecord(current, incoming)).toBe(incoming);
  });

  it('detects equivalent owner and truck records', () => {
    expect(areEquivalentOwnerRecords({ ownerName: 'Sharma', ownerPan: 'ABCDE1234F' }, { ownerName: 'Sharma', ownerPan: 'ABCDE1234F' })).toBe(true);
    expect(areEquivalentTruckRecords({ truckNumber: 'jh10db3312', ownerName: 'A' }, { truckNumber: 'JH10DB3312', ownerName: 'A' })).toBe(true);
  });

  it('groups duplicates and conflicts by key', () => {
    const grouped = groupPreferredByKey(
      [
        { truckNumber: 'JH10DB3312', ownerName: 'A', ownerPan: 'ABCDE1234F', sourceType: 'load' },
        { truckNumber: 'JH10DB3312', ownerName: 'A', ownerPan: 'ABCDE1234F', sourceType: 'payment' },
        { truckNumber: 'JH10DB3312', ownerName: 'B', ownerPan: 'AAAAA1111A', sourceType: 'payment' }
      ],
      (record) => record.truckNumber.toUpperCase(),
      areEquivalentTruckRecords
    );

    expect(grouped.records).toHaveLength(1);
    expect(grouped.duplicateRows).toHaveLength(1);
    expect(grouped.conflicts).toHaveLength(1);
  });
});
