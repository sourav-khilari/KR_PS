import {
  createTransportCompany,
  getTransportCompany,
  listTransportCompanies,
  setTransportCompanyInactive,
  updateTransportCompany
} from '../services/transportCompanyMaster.service.js';

export async function createTransportCompanyHandler(req, res, next) {
  try {
    const company = await createTransportCompany(req.body, req.user);
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
}

export async function updateTransportCompanyHandler(req, res, next) {
  try {
    const company = await updateTransportCompany(req.params.id, req.body, req.user);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function deleteTransportCompanyHandler(req, res, next) {
  try {
    const company = await setTransportCompanyInactive(req.params.id, req.user);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function getTransportCompanyHandler(req, res, next) {
  try {
    const company = await getTransportCompany(req.params.id);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function listTransportCompaniesHandler(req, res, next) {
  try {
    const result = await listTransportCompanies(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
