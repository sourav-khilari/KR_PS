import { normalizeTruckNumber } from '../helpers/normalize.js';

function idString(value) {
  if (!value) return '';
  return String(value._id || value).trim();
}

function ownerTruckRules(owner) {
  const map = owner?.truckWiseCommissionMap;
  if (!map) return [];
  return map instanceof Map ? [...map.entries()] : Object.entries(map);
}

function sameScope(rule, context) {
  return idString(rule.ownerId) === context.ownerId
    && idString(rule.transportCompanyId) === context.transportCompanyId
    && idString(rule.clientCompanyId) === context.clientCompanyId
    && idString(rule.plantId) === context.plantId;
}

function findOwnerTruckRule(owner, context) {
  const exactKey = [
    context.transportCompanyId,
    context.clientCompanyId,
    context.plantId,
    context.truckNumber
  ].join('|');

  const entry = ownerTruckRules(owner).find(([key]) => {
    const parts = String(key).split('|');
    if (parts.length !== 4) return false;
    return [parts[0], parts[1], parts[2], normalizeTruckNumber(parts[3])].join('|') === exactKey;
  });

  if (!entry) return null;
  return { commissionType: 'fixed', commissionValue: Number(entry[1]), ruleKey: entry[0] };
}

function debugResolution(context, result, repeatedTrip, repeatedTripIndex) {
  if (process.env.PAYMENTS_DEBUG_COMMISSION !== 'true') return;
  // Structured logging is intentionally flag-controlled because this runs once per payment row.
  console.log(JSON.stringify({
    event: 'PAYMENTS_COMMISSION_RESOLUTION',
    truckNumber: context.truckNumber,
    owner: context.ownerName,
    ownerId: context.ownerId,
    transportCompanyId: context.transportCompanyId,
    clientCompanyId: context.clientCompanyId,
    plantId: context.plantId,
    matchedRuleId: result.matchedRuleId,
    commissionType: result.type,
    commissionValue: result.value,
    commissionAmount: result.amount,
    commissionSource: result.source,
    fallbackUsed: result.fallbackUsed,
    repeatedTrip,
    repeatedTripIndex
  }));
}

export function resolveCommissionForRow({ owner, sourceRow, activeRules = [], repeatedTrip = false, repeatedTripIndex = 0 }) {
  const context = {
    ownerId: idString(owner?._id),
    ownerName: owner?.ownerName || '',
    transportCompanyId: idString(sourceRow?.transportCompanyId),
    clientCompanyId: idString(sourceRow?.clientCompanyId),
    plantId: idString(sourceRow?.plantId),
    truckNumber: normalizeTruckNumber(sourceRow?.normalizedRow?.truckNo)
  };

  const scopedRules = activeRules.filter((rule) => sameScope(rule, context));
  const collectionTruckRule = scopedRules.find(
    (rule) => normalizeTruckNumber(rule.truckNumber) === context.truckNumber
  );
  const mappedTruckRule = collectionTruckRule ? null : findOwnerTruckRule(owner, context);

  let resolved;
  if (collectionTruckRule) {
    resolved = {
      type: collectionTruckRule.commissionType,
      value: Number(collectionTruckRule.commissionValue),
      source: 'Truck Rule',
      matchedRuleId: idString(collectionTruckRule._id),
      fallbackUsed: false
    };
  } else if (mappedTruckRule) {
    resolved = {
      type: mappedTruckRule.commissionType,
      value: mappedTruckRule.commissionValue,
      source: 'Truck Rule',
      matchedRuleId: `owner-map:${mappedTruckRule.ruleKey}`,
      fallbackUsed: false
    };
  } else {
    const defaultRules = scopedRules.filter((rule) => !normalizeTruckNumber(rule.truckNumber));
    const defaultRule = defaultRules.find((rule) => rule.commissionType === 'percentage')
      || defaultRules.find((rule) => rule.commissionType === 'fixed');

    if (defaultRule) {
      resolved = {
        type: defaultRule.commissionType,
        value: Number(defaultRule.commissionValue),
        source: 'Default Rule',
        matchedRuleId: idString(defaultRule._id),
        fallbackUsed: true
      };
    } else if (['fixed', 'percentage'].includes(owner?.commissionType)) {
      resolved = {
        type: owner.commissionType,
        value: Number(owner.commissionValue || 0),
        source: 'Owner Default',
        matchedRuleId: null,
        fallbackUsed: true
      };
    } else {
      resolved = {
        type: 'fixed',
        value: 0,
        source: 'No Rule',
        matchedRuleId: null,
        fallbackUsed: true
      };
    }
  }

  let amount = resolved.type === 'percentage'
    ? Number(sourceRow?.normalizedRow?.frtAmt || 0) * (resolved.value / 100)
    : resolved.value;
  let source = resolved.source;

  if (resolved.type === 'fixed' && repeatedTrip && repeatedTripIndex > 0) {
    amount = 0;
    source = 'Commission Applied Above';
  }

  const result = { ...resolved, amount, source };
  debugResolution(context, result, repeatedTrip, repeatedTripIndex);
  return result;
}
