// backend/src/routes/admin/courses.routes.js
import { getCourses, createCourse } from '../../controllers/admin/courses.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function courseRoutes(fastify) {
  fastify.get('/', { preHandler: [authenticate] }, getCourses);
  fastify.post('/', { preHandler: [requireRole('admin')] }, createCourse);
}