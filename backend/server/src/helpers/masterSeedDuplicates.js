import {
  hasMeaningfulValue,
  normalizeSeederOwnerKey,
  normalizeSeederPan,
  normalizeSeederTruckNumber,
  pickPreferredDisplayValue
} from './masterSeederNormalization.js';

function recordScore(record) {
  let score = 0;

  if (hasMeaningfulValue(record.truckNumber)) score += 4;
  if (hasMeaningfulValue(record.ownerName)) score += 2;
  if (hasMeaningfulValue(record.ownerPan)) score += 3;
  if (record.sourceType === 'payment') score += 2;
  if (record.sourceType === 'load') score += 1;

  return score;
}

export function preferSeedRecord(current, incoming) {
  if (!current) return incoming;
  if (!incoming) return current;

  const currentScore = recordScore(current);
  const incomingScore = recordScore(incoming);

  if (incomingScore > currentScore) return incoming;
  if (incomingScore < currentScore) return current;

  const currentOwner = normalizeSeederOwnerKey(current.ownerName);
  const incomingOwner = normalizeSeederOwnerKey(incoming.ownerName);
  if (!currentOwner && incomingOwner) return incoming;
  if (incomingOwner && incomingOwner.length > currentOwner.length) return incoming;

  return current;
}

export function areEquivalentOwnerRecords(current, incoming) {
  const currentPan = normalizeSeederPan(current.ownerPan);
  const incomingPan = normalizeSeederPan(incoming.ownerPan);
  const currentOwner = normalizeSeederOwnerKey(current.ownerName);
  const incomingOwner = normalizeSeederOwnerKey(incoming.ownerName);

  if (currentPan && incomingPan) return currentPan === incomingPan;
  if (currentOwner && incomingOwner) return currentOwner === incomingOwner;

  return false;
}

export function areEquivalentTruckRecords(current, incoming) {
  const currentTruck = normalizeSeederTruckNumber(current.truckNumber);
  const incomingTruck = normalizeSeederTruckNumber(incoming.truckNumber);
  const currentOwner = normalizeSeederOwnerKey(current.ownerName);
  const incomingOwner = normalizeSeederOwnerKey(incoming.ownerName);
  const currentPan = normalizeSeederPan(current.ownerPan);
  const incomingPan = normalizeSeederPan(incoming.ownerPan);

  if (currentTruck !== incomingTruck) return false;
  if (currentPan && incomingPan && currentPan === incomingPan) return true;
  if (currentOwner && incomingOwner && currentOwner === incomingOwner) return true;
  if (!currentPan && incomingPan && currentOwner === incomingOwner) return true;
  if (currentPan && !incomingPan && currentOwner === incomingOwner) return true;

  return false;
}

export function groupPreferredByKey(records, getKey, areEquivalent = () => false) {
  const preferredByKey = new Map();
  const duplicateRows = [];
  const conflicts = [];

  records.forEach((record) => {
    const key = getKey(record);
    if (!key) return;

    const existing = preferredByKey.get(key);
    if (!existing) {
      preferredByKey.set(key, record);
      return;
    }

    if (areEquivalent(existing, record)) {
      const preferred = preferSeedRecord(existing, record);
      if (preferred !== existing) {
        duplicateRows.push({
          type: 'duplicate_replaced',
          key,
          kept: preferred,
          replaced: existing
        });
        preferredByKey.set(key, preferred);
      } else {
        duplicateRows.push({
          type: 'duplicate_skipped',
          key,
          kept: existing,
          skipped: record
        });
      }
      return;
    }

    conflicts.push({
      type: 'conflict',
      key,
      existing,
      incoming: record,
      reason: 'Different trusted mappings were found for the same key'
    });
  });

  return {
    records: [...preferredByKey.values()],
    duplicateRows,
    conflicts
  };
}

export function pickBetterDisplayName(currentValue, incomingValue) {
  return pickPreferredDisplayValue(currentValue, incomingValue);
}