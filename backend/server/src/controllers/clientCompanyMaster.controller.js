import {
  createClientCompany,
  getClientCompany,
  listClientCompanies,
  setClientCompanyInactive,
  updateClientCompany
} from '../services/clientCompanyMaster.service.js';

export async function createClientCompanyHandler(req, res, next) {
  try {
    const company = await createClientCompany(req.body, req.user);
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
}

export async function updateClientCompanyHandler(req, res, next) {
  try {
    const company = await updateClientCompany(req.params.id, req.body, req.user);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function deleteClientCompanyHandler(req, res, next) {
  try {
    const company = await setClientCompanyInactive(req.params.id, req.user);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function getClientCompanyHandler(req, res, next) {
  try {
    const company = await getClientCompany(req.params.id);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function listClientCompaniesHandler(req, res, next) {
  try {
    const result = await listClientCompanies(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
