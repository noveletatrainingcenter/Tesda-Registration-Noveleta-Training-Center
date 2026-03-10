// backend/src/routes/admin/backup.routes.js
import {
  listBackups, createBackup, downloadBackup,
  deleteBackup, restoreBackup, getSchedule, saveSchedule,
} from '../../controllers/admin/backup.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

export default async function backupRoutes(fastify) {
  const admin = { preHandler: [authenticate, requireRole('admin')] };

  fastify.get('/',                    admin, listBackups);
  fastify.post('/',                   admin, createBackup);
  fastify.get('/schedule',            admin, getSchedule);
  fastify.post('/schedule',           admin, saveSchedule);
  fastify.get('/download/:filename',  admin, downloadBackup);
  fastify.delete('/:filename',        admin, deleteBackup);
  fastify.post('/restore',            admin, restoreBackup);  // multipart
}