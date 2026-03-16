// backend/src/routes/shared/report.routes.js
import {
  getReports, getReport, createReport, updateReport, archiveReport, restoreReport,
} from '../../controllers/shared/report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export default async function reportRoutes(fastify) {
  fastify.get   ('/',          { preHandler: [authenticate] }, getReports);
  fastify.post  ('/',          { preHandler: [authenticate] }, createReport);
  fastify.get   ('/:id',       { preHandler: [authenticate] }, getReport);
  fastify.put   ('/:id',       { preHandler: [authenticate] }, updateReport);
  fastify.patch ('/:id/archive', { preHandler: [authenticate] }, archiveReport);
  fastify.patch ('/:id/restore', { preHandler: [authenticate] }, restoreReport);
}