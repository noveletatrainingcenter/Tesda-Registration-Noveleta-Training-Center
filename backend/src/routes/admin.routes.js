// backend/src/routes/admin.routes.js
import {
  getUsers, createUser, toggleUserStatus,
  getAuditLogs, getCourses, createCourse, changePassword
} from '../controllers/admin.controller.js';
import { requireRole, authenticate } from '../middleware/auth.middleware.js';

export default async function adminRoutes(fastify) {
  // User management (admin only)
  fastify.get('/users', { preHandler: [requireRole('admin')] }, getUsers);
  fastify.post('/users', { preHandler: [requireRole('admin')] }, createUser);
  fastify.patch('/users/:id/toggle', { preHandler: [requireRole('admin')] }, toggleUserStatus);

  // Audit logs (admin only)
  fastify.get('/audit-logs', { preHandler: [requireRole('admin')] }, getAuditLogs);

  // Courses (admin & encoder can read, admin can write)
  fastify.get('/courses', { preHandler: [authenticate] }, getCourses);
  fastify.post('/courses', { preHandler: [requireRole('admin')] }, createCourse);

  // Change own password
  fastify.post('/change-password', { preHandler: [authenticate] }, changePassword);
}
