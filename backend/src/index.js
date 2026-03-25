// backend/src/index.js
import dotenv from 'dotenv';
dotenv.config(); // ← MUST be before all other imports so env vars are available

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { testConnection } from './config/db.js';

// Shared routes
import authRoutes from './routes/shared/auth.routes.js';
import accountRoutes from './routes/shared/account.routes.js';
import registrationRoutes from './routes/shared/registration.routes.js';
import sectorRoutes from './routes/shared/sector.routes.js';
import courseRoutes from './routes/shared/course.routes.js';
import reportRoutes from './routes/shared/report.routes.js';

// Admin routes
import userRoutes from './routes/admin/users.routes.js';
import auditRoutes from './routes/admin/audit.routes.js';
import backupRoutes from './routes/admin/backup.routes.js';
import { loadAndStartScheduler } from './controllers/admin/backup.controller.js';

const fastify = Fastify({ logger: true });

// ── CORS must be first ────────────────────────────────────────────────────
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'tesda-secret-change-in-production',
});

await fastify.register(cookie);

// ── Shared routes ─────────────────────────────────────────────────────────
await fastify.register(authRoutes,          { prefix: '/api/auth' });
await fastify.register(accountRoutes,       { prefix: '/api/account' });
await fastify.register(registrationRoutes,  { prefix: '/api/registrations' });
await fastify.register(courseRoutes,        { prefix: '/api/courses' })
await fastify.register(sectorRoutes, { prefix: '/api/sectors' });
await fastify.register(reportRoutes,  { prefix: '/api/reports' }); 

// ── Admin routes ──────────────────────────────────────────────────────────
await fastify.register(userRoutes,   { prefix: '/api/admin/users' });
await fastify.register(auditRoutes,  { prefix: '/api/admin/audit-logs' });
await fastify.register(backupRoutes, { prefix: '/api/admin/backups' });

// ── Health check ──────────────────────────────────────────────────────────
fastify.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

// ── Start ─────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await testConnection();
    await loadAndStartScheduler();
    await fastify.listen({ port: parseInt(process.env.PORT) || 3001, host: '0.0.0.0' });
    console.log('🚀 Backend running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();