import { Router } from 'express';
import { USER_ROLES } from '../constants/roles.js';
import {
  createTransportCompanyHandler,
  deleteTransportCompanyHandler,
  getTransportCompanyHandler,
  listTransportCompaniesHandler,
  updateTransportCompanyHandler
} from '../controllers/transportCompanyMaster.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canManageMaster = requireRole(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

router.get('/', canManageMaster, listTransportCompaniesHandler);
router.post('/', canManageMaster, createTransportCompanyHandler);
router.get('/:id', canManageMaster, getTransportCompanyHandler);
router.patch('/:id', canManageMaster, updateTransportCompanyHandler);
router.delete('/:id', canManageMaster, deleteTransportCompanyHandler);

export default router;
