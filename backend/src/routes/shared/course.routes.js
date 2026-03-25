// backend/src/routes/shared/course.routes.js
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  toggleCourseStatus,
  archiveCourse,
  restoreCourse,
  deleteCourse,
} from '../../controllers/shared/course.controller.js';

export default async function courseRoutes(fastify) {
  fastify.get   ('/',              { preHandler: [authenticate] }, getCourses);
  fastify.get   ('/:id',           { preHandler: [authenticate] }, getCourse);
  fastify.post  ('/',              { preHandler: [authenticate] }, createCourse);
  fastify.put   ('/:id',           { preHandler: [authenticate] }, updateCourse);
  fastify.patch ('/:id/toggle',    { preHandler: [authenticate] }, toggleCourseStatus);
  fastify.patch ('/:id/archive',   { preHandler: [authenticate] }, archiveCourse);
  fastify.patch ('/:id/restore',   { preHandler: [authenticate] }, restoreCourse);
  fastify.delete('/:id',           { preHandler: [authenticate] }, deleteCourse);
}