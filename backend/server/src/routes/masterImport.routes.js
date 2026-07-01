import { Router } from 'express';
import { upload } from '../middleware/upload.middleware.js';
import {
  approveMasterImportRowHandler,
  cancelMasterImportHandler,
  deleteMasterImportRowHandler,
  getMasterImportHandler,
  listImportedDataHandler,
  listMasterImports,
  previewMasterImport,
  rejectMasterImportRowHandler,
  saveMasterImport,
  updateMasterImportRowHandler
} from '../controllers/masterImport.controller.js';

const router = Router();

router.get('/', listMasterImports);
router.get('/imported-data', listImportedDataHandler);
router.get('/:id', getMasterImportHandler);
router.post('/preview', upload.single('file'), previewMasterImport);
router.post('/save', saveMasterImport);
router.patch('/:id/rows/:rowId', updateMasterImportRowHandler);
router.delete('/:id/rows/:rowId', deleteMasterImportRowHandler);
router.post('/:id/rows/:rowId/approve', approveMasterImportRowHandler);
router.post('/:id/rows/:rowId/reject', rejectMasterImportRowHandler);
router.post('/:id/cancel', cancelMasterImportHandler);

export default router;
