import { Router } from 'express';
import { USER_ROLES } from '../constants/roles.js';
import {
  createTruckHandler,
  deleteTruckHandler,
  getTruckHandler,
  listTrucksHandler,
  updateTruckHandler
} from '../controllers/truckMaster.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canManageMaster = requireRole(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

router.get('/', canManageMaster, listTrucksHandler);
router.post('/', canManageMaster, createTruckHandler);
router.get('/:id', canManageMaster, getTruckHandler);
router.patch('/:id', canManageMaster, updateTruckHandler);
router.delete('/:id', canManageMaster, deleteTruckHandler);

export default router;
