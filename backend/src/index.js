// backend/src/index.js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import registrantRoutes from './routes/registrant.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// Plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'tesda-secret-change-in-production',
});

await fastify.register(cookie);

// Routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(registrantRoutes, { prefix: '/api/registrants' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

// Start
const start = async () => {
  await testConnection();
  try {
    await fastify.listen({ port: parseInt(process.env.PORT) || 3001, host: '0.0.0.0' });
    console.log('🚀 Backend running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();