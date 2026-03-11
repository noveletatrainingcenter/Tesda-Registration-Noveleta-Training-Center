import {
  listBackups, createBackup, downloadBackup,
  deleteBackup, restoreBackup, getSchedule, saveSchedule,
} from '../../controllers/admin/backup.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import multipart from '@fastify/multipart';

export default async function backupRoutes(fastify) {
  const admin = { preHandler: [authenticate, requireRole('admin')] };

  fastify.get('/',                   admin, listBackups);
  fastify.post('/',                  admin, createBackup);
  fastify.get('/schedule',           admin, getSchedule);
  fastify.post('/schedule',          admin, saveSchedule);
  fastify.get('/download/:filename', admin, downloadBackup);
  fastify.delete('/:filename',       admin, deleteBackup);

  // Register multipart ONLY for this route scope
  await fastify.register(async function (instance) {
    await instance.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
    instance.post('/restore', { preHandler: [authenticate, requireRole('admin')] }, restoreBackup);
  });
}