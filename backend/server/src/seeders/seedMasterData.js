import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongo } from '../config/db.js';
import { seedTrustedMasterData } from '../services/masterSeeder.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');

async function run() {
  await connectMongo(process.env.MONGODB_URI);

  const result = await seedTrustedMasterData({
    sourceFiles: [
      path.join(repoRoot, 'analysis_input', 'PURULIA TRUCK LOAD DETAILS (2026-27).xlsx'),
      path.join(repoRoot, 'analysis_input', 'SHREE PURULIA PAYMENT (2026-27).xlsx')
    ],
    createdBy: 'master-seeder'
  });

  console.log(`Master seed run completed: ${result.seedRun.seedRunId}`);
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(`Report written to: ${result.reportFilePath}`);
}

run()
  .catch((error) => {
    console.error('Failed to seed trusted master data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect();
  });