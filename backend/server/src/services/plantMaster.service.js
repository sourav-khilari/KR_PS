import { PlantMaster } from '../models/PlantMaster.js';
import { normalizeText } from '../helpers/normalize.js';
import { MASTER_STATUS } from '../constants/masterData.js';

function userId(user) {
  return user?.id || user?._id;
}

function duplicateError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

async function ensureUniqueCode(code, excludeId) {
  if (!code || normalizeText(code) === '') return; // Code is optional

  const query = { plantCode: normalizeText(code).toUpperCase() };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await PlantMaster.findOne(query);
  if (existing) {
    throw duplicateError('Plant code already exists');
  }
}

export async function createPlant(payload, currentUser) {
  const {
    plantName,
    plantCode,
    clientCompanyId,
    location,
    mobileNumber,
    email,
    address,
    remarks
  } = payload;

  if (!plantName || normalizeText(plantName) === '') {
    const error = new Error('Plant name is required');
    error.statusCode = 400;
    throw error;
  }

  await ensureUniqueCode(plantCode);

  return PlantMaster.create({
    plantName: normalizeText(plantName),
    normalizedPlantName: normalizeText(plantName).toUpperCase(),
    plantCode: plantCode ? normalizeText(plantCode).toUpperCase() : '',
    clientCompanyId: clientCompanyId || null,
    location: location ? normalizeText(location) : '',
    mobileNumber: mobileNumber ? normalizeText(mobileNumber) : '',
    email: email ? normalizeText(email).toLowerCase() : '',
    address: address ? normalizeText(address) : '',
    remarks: remarks ? normalizeText(remarks) : '',
    status: MASTER_STATUS.ACTIVE,
    createdBy: userId(currentUser),
    updatedBy: userId(currentUser)
  });
}

export async function updatePlant(id, payload, currentUser) {
  const existing = await PlantMaster.findById(id);
  if (!existing) {
    const error = new Error('Plant not found');
    error.statusCode = 404;
    throw error;
  }

  const {
    plantName,
    plantCode,
    clientCompanyId,
    location,
    mobileNumber,
    email,
    address,
    status,
    remarks
  } = payload;

  if (plantName !== undefined && normalizeText(plantName) === '') {
    const error = new Error('Plant name cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (plantCode !== undefined) {
    await ensureUniqueCode(plantCode, id);
  }

  if (plantName !== undefined) {
    existing.plantName = normalizeText(plantName);
    existing.normalizedPlantName = normalizeText(plantName).toUpperCase();
  }

  if (plantCode !== undefined) {
    existing.plantCode = plantCode ? normalizeText(plantCode).toUpperCase() : '';
  }

  if (clientCompanyId !== undefined) {
    existing.clientCompanyId = clientCompanyId || null;
  }

  if (location !== undefined) {
    existing.location = location ? normalizeText(location) : '';
  }

  if (mobileNumber !== undefined) {
    existing.mobileNumber = normalizeText(mobileNumber);
  }

  if (email !== undefined) {
    existing.email = email ? normalizeText(email).toLowerCase() : '';
  }

  if (address !== undefined) {
    existing.address = address ? normalizeText(address) : '';
  }

  if (status !== undefined) {
    existing.status = status;
  }

  if (remarks !== undefined) {
    existing.remarks = remarks ? normalizeText(remarks) : '';
  }

  existing.updatedBy = userId(currentUser);
  await existing.save();
  return existing;
}

export async function setPlantInactive(id, currentUser) {
  return updatePlant(id, { status: MASTER_STATUS.INACTIVE }, currentUser);
}

export async function getPlant(id) {
  const plant = await PlantMaster.findById(id);
  if (!plant) {
    const error = new Error('Plant not found');
    error.statusCode = 404;
    throw error;
  }
  return plant;
}

export async function listPlants(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  const sortBy = normalizeText(query.sortBy || 'plantName');
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
  const filter = {};

  if (query.status) filter.status = normalizeText(query.status).toLowerCase();
  if (query.clientCompanyId) filter.clientCompanyId = query.clientCompanyId;

  if (query.q) {
    const pattern = new RegExp(normalizeText(query.q), 'i');
    filter.$or = [
      { plantName: pattern },
      { plantCode: pattern },
      { location: pattern },
      { email: pattern },
      { mobileNumber: pattern }
    ];
  }

  const [items, total] = await Promise.all([
    PlantMaster.find(filter)
      .populate('clientCompanyId', 'companyName companyCode')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    PlantMaster.countDocuments(filter)
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
