// backend/src/routes/shared/auth.routes.js
import {
  detectUser, login, logout,
  getSecurityQuestion, adminResetPassword,
  generateEncoderTicket, useResetTicket, validateResetTicket,
  verifySecurityAnswer,
} from '../../controllers/shared/auth.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { sendOtp, verifyOtp, otpResetPassword } from '../../controllers/shared/otp.controller.js';

export default async function authRoutes(fastify) {
  // Public
  fastify.post('/detect',                   detectUser);
  fastify.post('/login',                    login);
  fastify.post('/forgot-password/question',       getSecurityQuestion);
  fastify.post('/forgot-password/verify-answer',  verifySecurityAnswer);
  fastify.post('/forgot-password/reset',          adminResetPassword);
  fastify.post('/reset-ticket/validate',    validateResetTicket);
  fastify.post('/reset-ticket/use',         useResetTicket);
  fastify.post('/otp/send',           sendOtp);
  fastify.post('/otp/verify',         verifyOtp);
  fastify.post('/otp/reset-password', otpResetPassword);

  // Protected
  fastify.post('/logout',                 { preHandler: [authenticate] },                      logout);
  fastify.post('/reset-ticket/generate',  { preHandler: [authenticate, requireRole('admin')] }, generateEncoderTicket);
}