// backend/src/routes/shared/registrant.routes.js
import {
  getRegistrants, getRegistrant,
  createRegistrant, updateRegistrant,
  archiveRegistrant, getStats
} from '../../controllers/shared/registrant.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function registrantRoutes(fastify) {
  fastify.get('/stats', { preHandler: [authenticate] }, getStats);
  fastify.get('/', { preHandler: [authenticate] }, getRegistrants);
  fastify.get('/:id', { preHandler: [authenticate] }, getRegistrant);
  fastify.post('/', { preHandler: [authenticate] }, createRegistrant);
  fastify.put('/:id', { preHandler: [authenticate] }, updateRegistrant);
  fastify.patch('/:id/archive', { preHandler: [requireRole('admin')] }, archiveRegistrant);
}