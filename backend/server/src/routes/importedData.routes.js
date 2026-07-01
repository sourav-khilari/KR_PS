import { Router } from 'express';
import { listImportedDataHandler } from '../controllers/masterImport.controller.js';

const router = Router();

router.get('/', listImportedDataHandler);

export default router;
