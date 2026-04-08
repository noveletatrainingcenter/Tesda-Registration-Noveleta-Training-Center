// backend/src/routes/admin/backup.routes.js
import {
  listBackups, createBackup, downloadBackup, deleteBackup,
  restoreBackup, previewImport, confirmImport, getSchedule, saveSchedule,
} from '../../controllers/admin/backup.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

// Shared routes — authenticated users (admin + encoder)
export default async function backupRoutes(fastify, _opts) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/',                listBackups);
  fastify.post('/',               createBackup);   // ← encoders can also create backups
  fastify.get('/download/*',      downloadBackup);
  fastify.get('/schedule',        getSchedule);
  fastify.post('/preview-import', previewImport);
  fastify.post('/confirm-import', confirmImport);
}

// Admin-only routes
export async function adminOnlyBackupRoutes(fastify, _opts) {
  fastify.addHook('onRequest', authenticate);
  fastify.addHook('onRequest', requireRole('admin'));

  fastify.delete('/delete/*', deleteBackup);
  fastify.post('/schedule',   saveSchedule);
  fastify.post('/restore',    restoreBackup);
}