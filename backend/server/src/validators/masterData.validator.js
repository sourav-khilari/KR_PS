import { COMMISSION_TYPES, COMMISSION_TYPE_VALUES, MASTER_STATUSES } from '../constants/masterData.js';
import { normalizeOwnerName, normalizePan, normalizeText, normalizeTruckNumber } from '../helpers/normalize.js';

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function numberOrZero(value) {
  if (value === '' || value === null || value === undefined) return 0;
  return Number(value);
}

export function isValidPan(value) {
  return PAN_PATTERN.test(normalizePan(value));
}

export function validateOwnerPayload(body = {}, options = {}) {
  const errors = [];
  const commissionType = normalizeText(body.commissionType || COMMISSION_TYPES.FIXED);
  const commissionValue = numberOrZero(body.commissionValue);
  const tdsPercentage = numberOrZero(body.tdsPercentage);
  const pan = normalizePan(body.panNumber);
  const ownerName = normalizeText(body.ownerName);
  const status = normalizeText(body.status || 'active').toLowerCase();

  if (!ownerName) errors.push('Owner name is required');
  if (pan && !isValidPan(pan)) {
    errors.push('PAN number format is invalid');
  }

  const truckWiseCommissionMap = {};
  if (body.truckWiseCommissionMap && typeof body.truckWiseCommissionMap === 'object') {
    Object.entries(body.truckWiseCommissionMap).forEach(([ruleKey, val]) => {
      const cleanedKey = normalizeText(ruleKey);
      if (cleanedKey) {
        truckWiseCommissionMap[cleanedKey] = numberOrZero(val);
      }
    });
  }

  if (!COMMISSION_TYPE_VALUES.includes(commissionType)) {
    errors.push('Commission type is invalid');
  }

  if (!Number.isFinite(commissionValue) || commissionValue < 0) {
    errors.push('Commission value must be a non-negative number');
  }

  if (commissionType === COMMISSION_TYPES.PERCENTAGE && commissionValue > 100) {
    errors.push('Percentage commission cannot be greater than 100');
  }

  if (!Number.isFinite(tdsPercentage) || tdsPercentage < 0 || tdsPercentage > 100) {
    errors.push('TDS percentage must be between 0 and 100');
  }

  if (!MASTER_STATUSES.includes(status)) {
    errors.push('Status must be active or inactive');
  }

  if (options.partial && Object.keys(body).length === 0) {
    errors.push('At least one field is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      ownerName,
      normalizedOwnerName: normalizeOwnerName(ownerName),
      panNumber: pan,
      mobileNumber: normalizeText(body.mobileNumber),
      address: normalizeText(body.address),
      tdsPercentage,
      commissionType,
      commissionValue,
      truckWiseCommissionMap,
      status,
      remarks: normalizeText(body.remarks)
    }
  };
}

export function validateTruckPayload(body = {}) {
  const errors = [];
  const truckNumber = normalizeText(body.truckNumber);
  const normalizedTruckNumber = normalizeTruckNumber(body.truckNumber);
  const ownerId = normalizeText(body.ownerId || body.ownerReference);
  const status = normalizeText(body.status || 'active').toLowerCase();

  if (!truckNumber) errors.push('Truck number is required');
  if (!normalizedTruckNumber) errors.push('Normalized truck number is required');
  if (!ownerId) errors.push('Owner reference is required');
  if (!MASTER_STATUSES.includes(status)) errors.push('Status must be active or inactive');

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      truckNumber: normalizedTruckNumber,
      normalizedTruckNumber,
      ownerId,
      status,
      remarks: normalizeText(body.remarks)
    }
  };
}
