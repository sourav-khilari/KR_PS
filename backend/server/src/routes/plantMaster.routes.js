import { Router } from 'express';
import { USER_ROLES } from '../constants/roles.js';
import {
  createPlantHandler,
  deletePlantHandler,
  getPlantHandler,
  listPlantsHandler,
  updatePlantHandler
} from '../controllers/plantMaster.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canManageMaster = requireRole(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

router.get('/', canManageMaster, listPlantsHandler);
router.post('/', canManageMaster, createPlantHandler);
router.get('/:id', canManageMaster, getPlantHandler);
router.patch('/:id', canManageMaster, updatePlantHandler);
router.delete('/:id', canManageMaster, deletePlantHandler);

export default router;
