// backend/src/routes/admin/audit.routes.js
import { getAuditLogs } from '../../controllers/admin/audit.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function auditRoutes(fastify) {
  // FIX: added `authenticate` — requireRole reads req.user which authenticate sets
  fastify.get('/', { preHandler: [authenticate, requireRole('admin')] }, getAuditLogs);
}