// backend/src/routes/shared/registration.routes.js
import {
  getRegistrations, getRegistration,
  createRegistration, updateRegistration,
  archiveRegistration, getStats,
} from '../../controllers/shared/registration.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function registrationRoutes(fastify) {
  fastify.get('/stats', { preHandler: [authenticate] }, getStats);
  fastify.get('/', { preHandler: [authenticate] }, getRegistrations);
  fastify.get('/:id', { preHandler: [authenticate] }, getRegistration);
  fastify.post('/', { preHandler: [authenticate] }, createRegistration);
  fastify.put('/:id', { preHandler: [authenticate] }, updateRegistration);
  fastify.patch('/:id/archive', { preHandler: [authenticate, requireRole('admin')] }, archiveRegistration);
}