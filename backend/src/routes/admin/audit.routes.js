// backend/src/routes/admin/audit.routes.js
import { getAuditLogs } from '../../controllers/admin/audit.controller.js';
import { requireRole } from '../../middleware/auth.middleware.js';

export default async function auditRoutes(fastify) {
  fastify.get('/', { preHandler: [requireRole('admin')] }, getAuditLogs);
}