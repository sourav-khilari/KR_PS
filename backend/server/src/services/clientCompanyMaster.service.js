import { ClientCompanyMaster } from '../models/ClientCompanyMaster.js';
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

  const query = { companyCode: normalizeText(code).toUpperCase() };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await ClientCompanyMaster.findOne(query);
  if (existing) {
    throw duplicateError('Company code already exists');
  }
}

export async function createClientCompany(payload, currentUser) {
  const {
    companyName,
    companyCode,
    mobileNumber,
    email,
    address,
    gstin,
    remarks
  } = payload;

  if (!companyName || normalizeText(companyName) === '') {
    const error = new Error('Company name is required');
    error.statusCode = 400;
    throw error;
  }

  await ensureUniqueCode(companyCode);

  return ClientCompanyMaster.create({
    companyName: normalizeText(companyName),
    normalizedCompanyName: normalizeText(companyName).toUpperCase(),
    companyCode: companyCode ? normalizeText(companyCode).toUpperCase() : '',
    mobileNumber: mobileNumber ? normalizeText(mobileNumber) : '',
    email: email ? normalizeText(email).toLowerCase() : '',
    address: address ? normalizeText(address) : '',
    gstin: gstin ? normalizeText(gstin).toUpperCase() : '',
    remarks: remarks ? normalizeText(remarks) : '',
    status: MASTER_STATUS.ACTIVE,
    createdBy: userId(currentUser),
    updatedBy: userId(currentUser)
  });
}

export async function updateClientCompany(id, payload, currentUser) {
  const existing = await ClientCompanyMaster.findById(id);
  if (!existing) {
    const error = new Error('Client company not found');
    error.statusCode = 404;
    throw error;
  }

  const {
    companyName,
    companyCode,
    mobileNumber,
    email,
    address,
    gstin,
    status,
    remarks
  } = payload;

  if (companyName !== undefined && normalizeText(companyName) === '') {
    const error = new Error('Company name cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (companyCode !== undefined) {
    await ensureUniqueCode(companyCode, id);
  }

  if (companyName !== undefined) {
    existing.companyName = normalizeText(companyName);
    existing.normalizedCompanyName = normalizeText(companyName).toUpperCase();
  }

  if (companyCode !== undefined) {
    existing.companyCode = companyCode ? normalizeText(companyCode).toUpperCase() : '';
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

  if (gstin !== undefined) {
    existing.gstin = gstin ? normalizeText(gstin).toUpperCase() : '';
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

export async function setClientCompanyInactive(id, currentUser) {
  return updateClientCompany(id, { status: MASTER_STATUS.INACTIVE }, currentUser);
}

export async function getClientCompany(id) {
  const company = await ClientCompanyMaster.findById(id);
  if (!company) {
    const error = new Error('Client company not found');
    error.statusCode = 404;
    throw error;
  }
  return company;
}

export async function listClientCompanies(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;
  const sortBy = normalizeText(query.sortBy || 'companyName');
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
  const filter = {};

  if (query.status) filter.status = normalizeText(query.status).toLowerCase();

  if (query.q) {
    const pattern = new RegExp(normalizeText(query.q), 'i');
    filter.$or = [
      { companyName: pattern },
      { companyCode: pattern },
      { email: pattern },
      { mobileNumber: pattern }
    ];
  }

  const [items, total] = await Promise.all([
    ClientCompanyMaster.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    ClientCompanyMaster.countDocuments(filter)
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
