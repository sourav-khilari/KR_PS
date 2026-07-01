import {
  createPlant,
  getPlant,
  listPlants,
  setPlantInactive,
  updatePlant
} from '../services/plantMaster.service.js';

export async function createPlantHandler(req, res, next) {
  try {
    const plant = await createPlant(req.body, req.user);
    res.status(201).json(plant);
  } catch (error) {
    next(error);
  }
}

export async function updatePlantHandler(req, res, next) {
  try {
    const plant = await updatePlant(req.params.id, req.body, req.user);
    res.json(plant);
  } catch (error) {
    next(error);
  }
}

export async function deletePlantHandler(req, res, next) {
  try {
    const plant = await setPlantInactive(req.params.id, req.user);
    res.json(plant);
  } catch (error) {
    next(error);
  }
}

export async function getPlantHandler(req, res, next) {
  try {
    const plant = await getPlant(req.params.id);
    res.json(plant);
  } catch (error) {
    next(error);
  }
}

export async function listPlantsHandler(req, res, next) {
  try {
    const result = await listPlants(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
