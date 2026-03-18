// backend/src/routes/admin/users.routes.js
import {
  getUsers,
  createUser,
  toggleUserStatus,
  updateUser,
} from '../../controllers/admin/users.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function userRoutes(fastify) {
  const admin = { preHandler: [authenticate, requireRole('admin')] };

  fastify.get('/',              admin, getUsers);
  fastify.post('/',             admin, createUser);
  fastify.patch('/:id/toggle',  admin, toggleUserStatus);
  fastify.patch('/:id',         admin, updateUser);   // ← add this
}