import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import { createApp } from '../src/app.js';
import { requireAuth } from '../src/middleware/auth.middleware.js';
import { User } from '../src/models/User.js';

vi.mock('../src/models/User.js', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn()
  }
}));

function fakeUser(overrides = {}) {
  return {
    _id: 'user-id-1',
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    isActive: true,
    comparePassword: vi.fn(async () => true),
    toSafeObject() {
      return {
        id: this._id,
        name: this.name,
        email: this.email,
        username: this.username,
        role: this.role,
        isActive: this.isActive
      };
    },
    ...overrides
  };
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  vi.clearAllMocks();
});

describe('auth API', () => {
  it('logs in with valid credentials', async () => {
    const user = fakeUser();
    User.findOne.mockReturnValue({
      select: vi.fn(async () => user)
    });

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'Admin@12345' })
      .expect(200);

    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({
      username: 'admin',
      role: 'admin'
    });
    expect(response.body.user.password).toBeUndefined();
  });

  it('rejects invalid passwords', async () => {
    const user = fakeUser({
      comparePassword: vi.fn(async () => false)
    });
    User.findOne.mockReturnValue({
      select: vi.fn(async () => user)
    });

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'wrong' })
      .expect(401);

    expect(response.body.message).toBe('Invalid username/email or password');
  });

  it('rejects invalid users', async () => {
    User.findOne.mockReturnValue({
      select: vi.fn(async () => null)
    });

    const response = await request(createApp())
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'missing', password: 'Admin@12345' })
      .expect(401);

    expect(response.body.message).toBe('Invalid username/email or password');
  });
});

function addJsonErrorHandler(app) {
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ message: error.message });
  });
}

describe('JWT middleware', () => {
  it('protects routes without a token', async () => {
    const app = express();
    app.get('/private', requireAuth, (_req, res) => res.json({ ok: true }));
    addJsonErrorHandler(app);

    const response = await request(app).get('/private').expect(401);
    expect(response.body.message).toBe('Authentication token is required');
  });

  it('allows requests with a valid token', async () => {
    User.findById.mockResolvedValue(fakeUser());
    const token = jwt.sign({ sub: 'user-id-1', role: 'admin' }, process.env.JWT_SECRET);
    const app = express();
    app.get('/private', requireAuth, (req, res) => res.json({ user: req.user }));
    addJsonErrorHandler(app);

    const response = await request(app)
      .get('/private')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.user).toMatchObject({
      username: 'admin',
      role: 'admin'
    });
  });
});

