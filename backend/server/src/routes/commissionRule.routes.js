import { Router } from 'express';
import {
  createRuleHandler,
  updateRuleHandler,
  deleteRuleHandler,
  listRulesHandler
} from '../controllers/commissionRule.controller.js';
import { USER_ROLES } from '../constants/roles.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canManageMaster = requireRole(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

router.get('/', canManageMaster, listRulesHandler);
router.post('/', canManageMaster, createRuleHandler);
router.patch('/:id', canManageMaster, updateRuleHandler);
router.delete('/:id', canManageMaster, deleteRuleHandler);

export default router;
