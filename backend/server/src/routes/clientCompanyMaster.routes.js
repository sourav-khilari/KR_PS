import { Router } from 'express';
import { USER_ROLES } from '../constants/roles.js';
import {
  createClientCompanyHandler,
  deleteClientCompanyHandler,
  getClientCompanyHandler,
  listClientCompaniesHandler,
  updateClientCompanyHandler
} from '../controllers/clientCompanyMaster.controller.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canManageMaster = requireRole(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

router.get('/', canManageMaster, listClientCompaniesHandler);
router.post('/', canManageMaster, createClientCompanyHandler);
router.get('/:id', canManageMaster, getClientCompanyHandler);
router.patch('/:id', canManageMaster, updateClientCompanyHandler);
router.delete('/:id', canManageMaster, deleteClientCompanyHandler);

export default router;
