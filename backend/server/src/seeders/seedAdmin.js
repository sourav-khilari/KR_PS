import dotenv from 'dotenv';
import { connectMongo } from '../config/db.js';
import { USER_ROLES } from '../constants/roles.js';
import { User } from '../models/User.js';

dotenv.config();

async function seedAdmin() {
  await connectMongo(process.env.MONGODB_URI);

  const name = process.env.DEFAULT_ADMIN_NAME || 'System Admin';
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const username = (process.env.DEFAULT_ADMIN_USERNAME || 'admin').toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    console.log(`Admin user already exists: ${existingUser.username}`);
    return;
  }

  await User.create({
    name,
    email,
    username,
    password,
    role: USER_ROLES.ADMIN,
    isActive: true
  });

  console.log(`Default admin user created: ${username}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin user:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect();
  });
