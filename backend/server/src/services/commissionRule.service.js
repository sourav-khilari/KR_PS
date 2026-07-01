import { CommissionRule } from '../models/CommissionRule.js';
import { normalizeTruckNumber } from '../helpers/normalize.js';

function duplicateError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

export async function checkDuplicateRule(payload, excludeId = null) {
  const truckNum = payload.truckNumber ? normalizeTruckNumber(payload.truckNumber) : '';
  const query = {
    ownerId: payload.ownerId,
    transportCompanyId: payload.transportCompanyId,
    clientCompanyId: payload.clientCompanyId,
    plantId: payload.plantId,
    truckNumber: truckNum,
    status: 'active'
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await CommissionRule.findOne(query);
  if (existing) {
    throw duplicateError('An active commission rule already exists for this Owner, Transport Company, Client Company, Plant, and Truck combination.');
  }
}

export function validateRulePayload(payload) {
  const errors = [];
  
  if (!payload.ownerId) errors.push('Owner is required');
  if (!payload.transportCompanyId) errors.push('Transport Company is required');
  if (!payload.clientCompanyId) errors.push('Client Company is required');
  if (!payload.plantId) errors.push('Plant is required');
  
  if (!payload.commissionType || !['fixed', 'percentage'].includes(payload.commissionType)) {
    errors.push('Commission Type must be either fixed or percentage');
  }

  if (payload.commissionValue === undefined || payload.commissionValue === null || Number.isNaN(Number(payload.commissionValue))) {
    errors.push('Commission Value is required and must be a number');
  } else {
    const val = Number(payload.commissionValue);
    if (val < 0) {
      errors.push('Commission Value must be a non-negative number');
    }
    if (payload.commissionType === 'percentage' && val > 100) {
      errors.push('Percentage commission value cannot exceed 100%');
    }
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(', '));
    error.statusCode = 400;
    throw error;
  }
}

export async function createCommissionRule(payload, currentUser) {
  validateRulePayload(payload);
  const truckNum = payload.truckNumber ? normalizeTruckNumber(payload.truckNumber) : '';
  
  const ruleData = {
    ownerId: payload.ownerId,
    transportCompanyId: payload.transportCompanyId,
    clientCompanyId: payload.clientCompanyId,
    plantId: payload.plantId,
    truckNumber: truckNum,
    commissionType: payload.commissionType,
    commissionValue: Number(payload.commissionValue),
    status: payload.status || 'active',
    remarks: payload.remarks || '',
    createdBy: currentUser?.id || currentUser?._id,
    updatedBy: currentUser?.id || currentUser?._id
  };

  if (ruleData.status === 'active') {
    await checkDuplicateRule(ruleData);
  }

  return CommissionRule.create(ruleData);
}

export async function updateCommissionRule(id, payload, currentUser) {
  const existing = await CommissionRule.findById(id);
  if (!existing) {
    const error = new Error('Commission rule not found');
    error.statusCode = 404;
    throw error;
  }

  const merged = {
    ownerId: payload.ownerId !== undefined ? payload.ownerId : existing.ownerId,
    transportCompanyId: payload.transportCompanyId !== undefined ? payload.transportCompanyId : existing.transportCompanyId,
    clientCompanyId: payload.clientCompanyId !== undefined ? payload.clientCompanyId : existing.clientCompanyId,
    plantId: payload.plantId !== undefined ? payload.plantId : existing.plantId,
    truckNumber: payload.truckNumber !== undefined ? (payload.truckNumber ? normalizeTruckNumber(payload.truckNumber) : '') : existing.truckNumber,
    commissionType: payload.commissionType !== undefined ? payload.commissionType : existing.commissionType,
    commissionValue: payload.commissionValue !== undefined ? payload.commissionValue : existing.commissionValue,
    status: payload.status !== undefined ? payload.status : existing.status,
    remarks: payload.remarks !== undefined ? payload.remarks : existing.remarks
  };

  validateRulePayload(merged);

  if (merged.status === 'active') {
    await checkDuplicateRule(merged, id);
  }

  Object.assign(existing, merged, {
    commissionValue: Number(merged.commissionValue),
    updatedBy: currentUser?.id || currentUser?._id
  });

  await existing.save();
  return existing;
}

export async function deleteCommissionRule(id) {
  const existing = await CommissionRule.findById(id);
  if (!existing) {
    const error = new Error('Commission rule not found');
    error.statusCode = 404;
    throw error;
  }
  // Soft delete or hard delete? Let's do hard delete so the user can completely clean it up if they want.
  await CommissionRule.findByIdAndDelete(id);
  return { success: true };
}

export async function listCommissionRules(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.ownerId) {
    filter.ownerId = query.ownerId;
  }

  if (query.q) {
    // Search by truckNumber or remarks
    const pattern = new RegExp(query.q.trim(), 'i');
    filter.$or = [
      { truckNumber: pattern },
      { remarks: pattern }
    ];
  }

  const [items, total] = await Promise.all([
    CommissionRule.find(filter)
      .populate('ownerId', 'ownerName panNumber')
      .populate('transportCompanyId', 'companyName')
      .populate('clientCompanyId', 'companyName')
      .populate('plantId', 'plantName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CommissionRule.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
