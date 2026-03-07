// backend/src/routes/auth.routes.js
import {
  detectUser, login, logout,
  getSecurityQuestion, adminResetPassword,
  generateEncoderTicket, useResetTicket
} from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

export default async function authRoutes(fastify) {
  // Public
  fastify.post('/detect', detectUser);
  fastify.post('/login', login);
  fastify.post('/forgot-password/question', getSecurityQuestion);
  fastify.post('/forgot-password/reset', adminResetPassword);
  fastify.post('/reset-ticket/use', useResetTicket);

  // Protected
  fastify.post('/logout', { preHandler: [authenticate] }, logout);
  fastify.post('/reset-ticket/generate', { preHandler: [requireRole('admin')] }, generateEncoderTicket);
}
