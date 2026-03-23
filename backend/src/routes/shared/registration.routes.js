// backend/src/routes/shared/registration.routes.js
import {
  getRegistrations, getRegistration,
  createRegistration, updateRegistration,
  archiveRegistration, restoreRegistration, getStats,
  getTrainingStats, getEmploymentStats, getDemographics, getTimeline,
  getCourseStats  // ← Add this new import
} from '../../controllers/shared/registration.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function registrationRoutes(fastify) {
  // Analytics routes
  fastify.get('/stats', { preHandler: [authenticate] }, getStats);
  fastify.get('/training-stats', { preHandler: [authenticate] }, getTrainingStats);
  fastify.get('/employment-stats', { preHandler: [authenticate] }, getEmploymentStats);
  fastify.get('/demographics', { preHandler: [authenticate] }, getDemographics);
  fastify.get('/timeline', { preHandler: [authenticate] }, getTimeline);
  fastify.get('/course-stats', { preHandler: [authenticate] }, getCourseStats);  // ← Add this new route
  
  // CRUD routes
  fastify.get('/', { preHandler: [authenticate] }, getRegistrations);
  fastify.get('/:id', { preHandler: [authenticate] }, getRegistration);
  fastify.post('/', { preHandler: [authenticate] }, createRegistration);
  fastify.put('/:id', { preHandler: [authenticate] }, updateRegistration);
  fastify.patch('/:id/archive', { preHandler: [authenticate, requireRole('admin')] }, archiveRegistration);
  fastify.patch('/:id/restore', { preHandler: [authenticate, requireRole('admin')] }, restoreRegistration);
}