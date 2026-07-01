import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import masterImportRoutes from './routes/masterImport.routes.js';
import importedDataRoutes from './routes/importedData.routes.js';
import paymentRoutes from './routes/paymentGeneration.routes.js';
import ownerMasterRoutes from './routes/ownerMaster.routes.js';
import truckMasterRoutes from './routes/truckMaster.routes.js';
import transportCompanyRoutes from './routes/transportCompanyMaster.routes.js';
import clientCompanyRoutes from './routes/clientCompanyMaster.routes.js';
import plantRoutes from './routes/plantMaster.routes.js';
import commissionRuleRoutes from './routes/commissionRule.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/owners', requireAuth, ownerMasterRoutes);
  app.use('/api/trucks', requireAuth, truckMasterRoutes);
  app.use('/api/transport-companies', requireAuth, transportCompanyRoutes);
  app.use('/api/client-companies', requireAuth, clientCompanyRoutes);
  app.use('/api/plants', requireAuth, plantRoutes);
  app.use('/api/commission-rules', requireAuth, commissionRuleRoutes);
  app.use('/api/master-imports', requireAuth, masterImportRoutes);
  app.use('/api/imported-data', requireAuth, importedDataRoutes);
  app.use('/api/payments', requireAuth, paymentRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

