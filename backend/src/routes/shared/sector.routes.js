// backend/src/routes/shared/sector.routes.js
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getSectors,
  createSector,
  updateSector,
  toggleSector,
} from '../../controllers/shared/sector.controller.js';

export default async function sectorRoutes(fastify, opts) {
  fastify.get('/',           { preHandler: [authenticate] }, getSectors);
  fastify.post('/',          { preHandler: [authenticate] }, createSector);
  fastify.put('/:id',        { preHandler: [authenticate] }, updateSector);
  fastify.patch('/:id/toggle', { preHandler: [authenticate] }, toggleSector);
}