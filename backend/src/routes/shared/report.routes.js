// backend/src/routes/shared/report.routes.js
import {
  getReports, getReport, createReport, updateReport, archiveReport,
} from '../../controllers/shared/report.controller.js';

export default async function reportRoutes(fastify) {
  fastify.get   ('/reports',              getReports);
  fastify.post  ('/reports',              createReport);
  fastify.get   ('/reports/:id',          getReport);
  fastify.put   ('/reports/:id',          updateReport);
  fastify.patch ('/reports/:id/archive',  archiveReport);
}