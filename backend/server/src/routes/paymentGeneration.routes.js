import { Router } from 'express';
import {
  getPreviewHandler,
  saveRunHandler,
  listHistoryHandler,
  getRunDetailsHandler,
  exportExcelHandler,
  getGlobalSettingsHandler,
  updateGlobalSettingsHandler,
  getMasterPrepSummaryHandler
} from '../controllers/paymentGeneration.controller.js';
import { USER_ROLES } from '../constants/roles.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const canGeneratePayments = requireRole(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

router.get('/preview', canGeneratePayments, getPreviewHandler);
router.post('/save', canGeneratePayments, saveRunHandler);
router.get('/history', canGeneratePayments, listHistoryHandler);
router.get('/master-prep-summary', canGeneratePayments, getMasterPrepSummaryHandler);
router.get('/runs/:runId', canGeneratePayments, getRunDetailsHandler);
router.get('/runs/:runId/export-excel', canGeneratePayments, exportExcelHandler);
router.get('/settings', canGeneratePayments, getGlobalSettingsHandler);
router.put('/settings', canGeneratePayments, updateGlobalSettingsHandler);

export default router;
