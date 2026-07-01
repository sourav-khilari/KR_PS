import { MASTER_STATUS } from '../constants/masterData.js';
import { normalizeText, normalizeTruckNumber } from '../helpers/normalize.js';
import { OwnerMaster } from '../models/OwnerMaster.js';
import { TruckMaster } from '../models/TruckMaster.js';
import { validateTruckPayload } from '../validators/masterData.validator.js';

function userId(user) {
  return user?.id || user?._id;
}

function duplicateError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

async function ensureOwnerExists(ownerId) {
  const owner = await OwnerMaster.findById(ownerId);
  if (!owner) {
    const error = new Error('Owner reference is invalid');
    error.statusCode = 400;
    throw error;
  }
  return owner;
}

async function ensureUniqueActiveTruck(normalizedTruckNumber, excludeId) {
  const query = {
    normalizedTruckNumber: normalizeTruckNumber(normalizedTruckNumber),
    status: MASTER_STATUS.ACTIVE
  };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await TruckMaster.findOne(query);
  if (existing) {
    throw duplicateError('Active truck number already exists');
  }
}

export async function createTruck(payload, currentUser) {
  const validation = validateTruckPayload(payload);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(', '));
    error.statusCode = 400;
    throw error;
  }

  await ensureOwnerExists(validation.value.ownerId);
  if (validation.value.status === MASTER_STATUS.ACTIVE) {
    await ensureUniqueActiveTruck(validation.value.normalizedTruckNumber);
  }

  return TruckMaster.create({
    ...validation.value,
    createdBy: userId(currentUser),
    updatedBy: userId(currentUser)
  });
}

export async function updateTruck(id, payload, currentUser) {
  const existing = await TruckMaster.findById(id);
  if (!existing) {
    const error = new Error('Truck not found');
    error.statusCode = 404;
    throw error;
  }

  const merged = {
    truckNumber: existing.truckNumber,
    ownerId: existing.ownerId,
    status: existing.status,
    remarks: existing.remarks,
    ...payload
  };

  const validation = validateTruckPayload(merged);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(', '));
    error.statusCode = 400;
    throw error;
  }

  await ensureOwnerExists(validation.value.ownerId);
  if (validation.value.status === MASTER_STATUS.ACTIVE) {
    await ensureUniqueActiveTruck(validation.value.normalizedTruckNumber, id);
  }

  Object.assign(existing, validation.value, { updatedBy: userId(currentUser) });
  await existing.save();
  return existing;
}

export async function setTruckInactive(id, currentUser) {
  return updateTruck(id, { status: MASTER_STATUS.INACTIVE }, currentUser);
}

export async function getTruck(id) {
  const truck = await TruckMaster.findById(id).populate('ownerId', 'ownerName panNumber status');
  if (!truck) {
    const error = new Error('Truck not found');
    error.statusCode = 404;
    throw error;
  }
  return truck;
}

export async function listTrucks(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  const sortBy = normalizeText(query.sortBy || 'truckNumber');
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
  const filter = {};

  if (query.status) filter.status = normalizeText(query.status).toLowerCase();
  if (query.ownerId) filter.ownerId = query.ownerId;

  if (query.q) {
    const search = normalizeText(query.q);
    const ownerIds = await OwnerMaster.find({ ownerName: new RegExp(search, 'i') }).distinct('_id');
    filter.$or = [
      { truckNumber: new RegExp(search, 'i') },
      { normalizedTruckNumber: new RegExp(normalizeTruckNumber(search), 'i') },
      { ownerId: { $in: ownerIds } }
    ];
  }

  const [items, total] = await Promise.all([
    TruckMaster.find(filter)
      .populate('ownerId', 'ownerName panNumber status')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    TruckMaster.countDocuments(filter)
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
