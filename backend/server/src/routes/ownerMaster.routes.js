import { Router } from 'express';
import {
  createOwnerHandler,
  deleteOwnerHandler,
  getOwnerHandler,
  listOwnersHandler,
  updateOwnerHandler
} from '../controllers/ownerMaster.controller.js';
import { USER_ROLES } from '../constants/roles.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canManageMaster = requireRole(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

router.get('/', canManageMaster, listOwnersHandler);
router.post('/', canManageMaster, createOwnerHandler);
router.get('/:id', canManageMaster, getOwnerHandler);
router.patch('/:id', canManageMaster, updateOwnerHandler);
router.delete('/:id', canManageMaster, deleteOwnerHandler);

export default router;
