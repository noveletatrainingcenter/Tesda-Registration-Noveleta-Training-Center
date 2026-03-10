// backend/src/routes/admin/users.routes.js
import { getUsers, createUser, toggleUserStatus } from '../../controllers/admin/users.controller.js';
import { requireRole } from '../../middleware/auth.middleware.js';

export default async function userRoutes(fastify) {
  fastify.get('/', { preHandler: [requireRole('admin')] }, getUsers);
  fastify.post('/', { preHandler: [requireRole('admin')] }, createUser);
  fastify.patch('/:id/toggle', { preHandler: [requireRole('admin')] }, toggleUserStatus);
}