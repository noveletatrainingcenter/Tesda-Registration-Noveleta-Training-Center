// backend/src/routes/admin/users.routes.js
import { getUsers, createUser, toggleUserStatus } from '../../controllers/admin/users.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function userRoutes(fastify) {
  // FIX: all three routes were missing `authenticate`
  // requireRole('admin') checks req.user.role — that object only exists after authenticate runs
  const admin = { preHandler: [authenticate, requireRole('admin')] };

  fastify.get('/',            admin, getUsers);
  fastify.post('/',           admin, createUser);
  fastify.patch('/:id/toggle', admin, toggleUserStatus);
}