// backend/src/routes/shared/account.routes.js
import { changePassword } from '../../controllers/shared/account.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export default async function accountRoutes(fastify) {
  fastify.post('/change-password', { preHandler: [authenticate] }, changePassword);
}