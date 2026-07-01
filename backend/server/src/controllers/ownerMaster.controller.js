import {
  createOwner,
  getOwner,
  listOwners,
  setOwnerInactive,
  updateOwner
} from '../services/ownerMaster.service.js';

export async function createOwnerHandler(req, res, next) {
  try {
    const owner = await createOwner(req.body, req.user);
    res.status(201).json(owner);
  } catch (error) {
    next(error);
  }
}

export async function updateOwnerHandler(req, res, next) {
  try {
    const owner = await updateOwner(req.params.id, req.body, req.user);
    res.json(owner);
  } catch (error) {
    next(error);
  }
}

export async function deleteOwnerHandler(req, res, next) {
  try {
    const owner = await setOwnerInactive(req.params.id, req.user);
    res.json(owner);
  } catch (error) {
    next(error);
  }
}

export async function getOwnerHandler(req, res, next) {
  try {
    const owner = await getOwner(req.params.id);
    res.json(owner);
  } catch (error) {
    next(error);
  }
}

export async function listOwnersHandler(req, res, next) {
  try {
    const result = await listOwners(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
