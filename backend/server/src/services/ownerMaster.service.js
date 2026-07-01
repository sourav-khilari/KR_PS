import { OwnerMaster } from '../models/OwnerMaster.js';
import { validateOwnerPayload } from '../validators/masterData.validator.js';
import { MASTER_STATUS } from '../constants/masterData.js';
import { normalizePan, normalizeText } from '../helpers/normalize.js';

function userId(user) {
  return user?.id || user?._id;
}

function duplicateError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

async function ensureUniquePan(panNumber, excludeId) {
  const query = { panNumber: normalizePan(panNumber) };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await OwnerMaster.findOne(query);
  if (existing) {
    throw duplicateError('PAN number already exists');
  }
}

export async function createOwner(payload, currentUser) {
  const validation = validateOwnerPayload(payload);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(', '));
    error.statusCode = 400;
    throw error;
  }

  if (validation.value.panNumber !== null && validation.value.panNumber !== undefined && validation.value.panNumber !== '') {
    await ensureUniquePan(validation.value.panNumber);
  }

  return OwnerMaster.create({
    ...validation.value,
    createdBy: userId(currentUser),
    updatedBy: userId(currentUser)
  });
}

export async function updateOwner(id, payload, currentUser) {
  const existing = await OwnerMaster.findById(id);
  if (!existing) {
    const error = new Error('Owner not found');
    error.statusCode = 404;
    throw error;
  }

  const merged = {
    ownerName: existing.ownerName,
    panNumber: existing.panNumber,
    mobileNumber: existing.mobileNumber,
    address: existing.address,
    tdsPercentage: existing.tdsPercentage,
    commissionType: existing.commissionType,
    commissionValue: existing.commissionValue,
    truckWiseCommissionMap: existing.truckWiseCommissionMap
      ? Object.fromEntries(existing.truckWiseCommissionMap)
      : {},
    status: existing.status,
    remarks: existing.remarks,
    ...payload
  };

  const validation = validateOwnerPayload(merged);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(', '));
    error.statusCode = 400;
    throw error;
  }

  if(validation.value.panNumber !== null && validation.value.panNumber !== undefined && validation.value.panNumber !== '') {
    await ensureUniquePan(validation.value.panNumber, id);
  }
  //await ensureUniquePan(validation.value.panNumber, id);

  Object.assign(existing, validation.value, { updatedBy: userId(currentUser) });
  await existing.save();
  return existing;
}

export async function setOwnerInactive(id, currentUser) {
  return updateOwner(id, { status: MASTER_STATUS.INACTIVE }, currentUser);
}

export async function getOwner(id) {
  const owner = await OwnerMaster.findById(id);
  if (!owner) {
    const error = new Error('Owner not found');
    error.statusCode = 404;
    throw error;
  }
  return owner;
}

export async function listOwners(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  const sortBy = normalizeText(query.sortBy || 'ownerName');
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
  const filter = {};

  if (query.status) filter.status = normalizeText(query.status).toLowerCase();
  if (query.q) {
    const pattern = new RegExp(normalizeText(query.q), 'i');
    filter.$or = [{ ownerName: pattern }, { panNumber: pattern }];
  }

  const [items, total] = await Promise.all([
    OwnerMaster.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    OwnerMaster.countDocuments(filter)
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
