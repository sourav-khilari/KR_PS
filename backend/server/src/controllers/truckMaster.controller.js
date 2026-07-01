import {
  createTruck,
  getTruck,
  listTrucks,
  setTruckInactive,
  updateTruck
} from '../services/truckMaster.service.js';

export async function createTruckHandler(req, res, next) {
  try {
    const truck = await createTruck(req.body, req.user);
    res.status(201).json(truck);
  } catch (error) {
    next(error);
  }
}

export async function updateTruckHandler(req, res, next) {
  try {
    const truck = await updateTruck(req.params.id, req.body, req.user);
    res.json(truck);
  } catch (error) {
    next(error);
  }
}

export async function deleteTruckHandler(req, res, next) {
  try {
    const truck = await setTruckInactive(req.params.id, req.user);
    res.json(truck);
  } catch (error) {
    next(error);
  }
}

export async function getTruckHandler(req, res, next) {
  try {
    const truck = await getTruck(req.params.id);
    res.json(truck);
  } catch (error) {
    next(error);
  }
}

export async function listTrucksHandler(req, res, next) {
  try {
    const result = await listTrucks(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
