import dotenv from 'dotenv';
import { createApp } from './app.js';
import { connectMongo } from './config/db.js';

dotenv.config();

const port = process.env.PORT || 5000;

async function start() {
  await connectMongo(process.env.MONGODB_URI);
  const app = createApp();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
