// backend/src/index.js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';        // ← add
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';

// Shared routes
import authRoutes from './routes/shared/auth.routes.js';
import accountRoutes from './routes/shared/account.routes.js';
import registrantRoutes from './routes/shared/registrant.routes.js';

// Admin routes
import userRoutes from './routes/admin/users.routes.js';
import auditRoutes from './routes/admin/audit.routes.js';
import courseRoutes from './routes/admin/courses.routes.js';
import backupRoutes from './routes/admin/backup.routes.js';  // ← add
import { loadAndStartScheduler } from './controllers/admin/backup.controller.js';

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
await fastify.register(multipart, {             // ← add
  limits: { fileSize: 50 * 1024 * 1024 },      //   50 MB cap for .sql uploads
});

// Shared routes
await fastify.register(authRoutes,       { prefix: '/api/auth' });
await fastify.register(accountRoutes,    { prefix: '/api/account' });
await fastify.register(registrantRoutes, { prefix: '/api/registrants' });

// Admin routes
await fastify.register(userRoutes,   { prefix: '/api/admin/users' });
await fastify.register(auditRoutes,  { prefix: '/api/admin/audit-logs' });
await fastify.register(courseRoutes, { prefix: '/api/admin/courses' });
await fastify.register(backupRoutes, { prefix: '/api/admin/backups' });

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

// Start
const start = async () => {
  await testConnection();
  await loadAndStartScheduler(); // ← add this line right after testConnection
  try {
    await fastify.listen({ port: parseInt(process.env.PORT) || 3001, host: '0.0.0.0' });
    console.log('🚀 Backend running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();