// backend/src/controllers/admin/backup.controller.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import db from '../../config/db.js';

const execAsync = promisify(exec);
const BACKUP_DIR = path.resolve(process.cwd(), 'backups', 'Tesda-Registration-Backups');

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function getDbConfig() {
  return {
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    name:     process.env.DB_NAME     || 'tesda_registration',
    bin:      process.env.MYSQL_BIN   || 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin',
  };
}

function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function makeFilename(type = 'manual') {
  const now = new Date();
  const ts  = now.toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19);
  return type === 'auto'
    ? `backup_${ts}.sql`
    : `backup_${ts}_manual.sql`;
}

// ── List backups ────────────────────────────────────────────────────────────
export async function listBackups(request, reply) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(name => {
        const filepath = path.join(BACKUP_DIR, name);
        const stat     = fs.statSync(filepath);
        return {
          name,
          size:       formatSize(stat.size),
          size_bytes: stat.size,
          created_at: stat.birthtime,
          type:       name.includes('manual') ? 'manual' : 'auto',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return reply.send({ success: true, data: files });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Failed to list backups.' });
  }
}

// ── Create backup ───────────────────────────────────────────────────────────
export async function createBackup(request, reply) {
  const { type = 'manual' } = request.body || {};
  const db_cfg   = getDbConfig();
  const filename = makeFilename(type);
  const outPath  = path.join(BACKUP_DIR, filename);
  const mysqldump = path.join(db_cfg.bin, 'mysqldump');
  const pwFlag   = db_cfg.password ? `-p${db_cfg.password}` : '';
  const cmd      = `"${mysqldump}" -h ${db_cfg.host} -u ${db_cfg.user} ${pwFlag} ${db_cfg.name} > "${outPath}"`;

  try {
    await execAsync(cmd, { shell: true });
    const stat = fs.statSync(outPath);

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'CREATE_BACKUP', 'Backup', `Created: ${filename}`, request.ip]
    );

    return reply.code(201).send({
      success: true,
      data: { name: filename, size: formatSize(stat.size), created_at: stat.birthtime, type },
      message: 'Backup created successfully.',
    });
  } catch (err) {
    request.log.error(err);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    return reply.code(500).send({ success: false, message: 'Backup failed: ' + err.message });
  }
}

// ── Download backup ─────────────────────────────────────────────────────────
export async function downloadBackup(request, reply) {
  const { filename } = request.params;

  if (filename.includes('/') || filename.includes('..')) {
    return reply.code(400).send({ success: false, message: 'Invalid filename.' });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return reply.code(404).send({ success: false, message: 'Backup file not found.' });
  }

  const stream = fs.createReadStream(filepath);
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  reply.header('Content-Type', 'application/octet-stream');
  return reply.send(stream);
}

// ── Delete backup ───────────────────────────────────────────────────────────
export async function deleteBackup(request, reply) {
  const { filename } = request.params;

  if (filename.includes('/') || filename.includes('..')) {
    return reply.code(400).send({ success: false, message: 'Invalid filename.' });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return reply.code(404).send({ success: false, message: 'Backup file not found.' });
  }

  try {
    fs.unlinkSync(filepath);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'DELETE_BACKUP', 'Backup', `Deleted: ${filename}`, request.ip]
    );
    return reply.send({ success: true, message: 'Backup deleted.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Failed to delete backup.' });
  }
}

// ── Restore from uploaded file ──────────────────────────────────────────────
export async function restoreBackup(request, reply) {
  const data = await request.file();
  if (!data || !data.filename.endsWith('.sql')) {
    return reply.code(400).send({ success: false, message: 'A valid .sql file is required.' });
  }

  const db_cfg   = getDbConfig();
  const mysqldump = path.join(db_cfg.bin, 'mysqldump');
  const mysql    = path.join(db_cfg.bin, 'mysql');
  const pwFlag   = db_cfg.password ? `-p${db_cfg.password}` : '';

  // Auto-backup before restore for safety
  const safeName = makeFilename('auto').replace('.sql', '_pre-restore.sql');
  const safePath = path.join(BACKUP_DIR, safeName);
  await execAsync(`"${mysqldump}" -h ${db_cfg.host} -u ${db_cfg.user} ${pwFlag} ${db_cfg.name} > "${safePath}"`, { shell: true }).catch(() => {});

  // Save uploaded file to temp
  const tmpPath = path.join(BACKUP_DIR, `tmp_restore_${Date.now()}.sql`);
  const buffer  = await data.toBuffer();
  fs.writeFileSync(tmpPath, buffer);

  const cmd = `"${mysql}" -h ${db_cfg.host} -u ${db_cfg.user} ${pwFlag} ${db_cfg.name} < "${tmpPath}"`;

  try {
    await execAsync(cmd, { shell: true });
    fs.unlinkSync(tmpPath);

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'RESTORE_BACKUP', 'Backup', `Restored from: ${data.filename}`, request.ip]
    );

    return reply.send({ success: true, message: 'Database restored successfully.' });
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Restore failed: ' + err.message });
  }
}

// ── Scheduled backup runner (internal) ─────────────────────────────────────
async function runScheduledBackup() {
  const db_cfg    = getDbConfig();
  const filename  = makeFilename('auto');
  const outPath   = path.join(BACKUP_DIR, filename);
  const mysqldump = path.join(db_cfg.bin, 'mysqldump');
  const pwFlag    = db_cfg.password ? `-p${db_cfg.password}` : '';

  try {
    await execAsync(`"${mysqldump}" -h ${db_cfg.host} -u ${db_cfg.user} ${pwFlag} ${db_cfg.name} > "${outPath}"`, { shell: true });
    console.log(`✅ Scheduled backup created: ${filename}`);

    // Enforce retention
    const [rows] = await db.execute(
      `SELECT setting_value FROM backup_settings WHERE setting_key = 'backup_retention'`
    );
    const retentionDays = parseInt(rows[0]?.setting_value) || 14;
    const cutoff        = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql'))
      .forEach(file => {
        const filepath = path.join(BACKUP_DIR, file);
        if (fs.statSync(filepath).birthtime < cutoff) {
          fs.unlinkSync(filepath);
          console.log(`🗑️  Deleted old backup: ${file}`);
        }
      });
  } catch (err) {
    console.error('❌ Scheduled backup failed:', err.message);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  }
}

// ── Cron management ─────────────────────────────────────────────────────────
let currentCronJob = null;

export function applySchedule(schedule, time = '02:00') {
  if (currentCronJob) { currentCronJob.stop(); currentCronJob = null; }
  const [hour, minute] = time.split(':');
  const cronExpr = schedule === 'weekly'
    ? `${minute} ${hour} * * 0`
    : `${minute} ${hour} * * *`;
  currentCronJob = cron.schedule(cronExpr, runScheduledBackup, { timezone: 'Asia/Manila' });
  console.log(`📅 Backup schedule set: ${schedule} at ${time} (${cronExpr})`);
}

export async function loadAndStartScheduler() {
  try {
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value FROM backup_settings WHERE setting_key IN ('backup_schedule', 'backup_retention', 'backup_time')`
    );
    const map = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
    applySchedule(map.backup_schedule || 'daily', map.backup_time || '02:00');
  } catch {
    applySchedule('daily', '02:00');
  }
}

// ── Get/Save schedule settings ──────────────────────────────────────────────
export async function getSchedule(_request, reply) {
  try {
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value FROM backup_settings WHERE setting_key IN ('backup_schedule', 'backup_retention', 'backup_time')`
    );
    const map = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
    return reply.send({
      success: true,
      data: {
        schedule:  map.backup_schedule || 'daily',
        retention: parseInt(map.backup_retention) || 14,
        time:      map.backup_time || '02:00',
      },
    });
  } catch {
    return reply.send({ success: true, data: { schedule: 'daily', retention: 14, time: '02:00' } });
  }
}

export async function saveSchedule(request, reply) {
  const { schedule, retention, time = '02:00' } = request.body;
  if (!['daily', 'weekly'].includes(schedule)) {
    return reply.code(400).send({ success: false, message: 'Invalid schedule.' });
  }
  if (retention < 7 || retention > 90) {
    return reply.code(400).send({ success: false, message: 'Retention must be 7–90 days.' });
  }
  try {
    await db.execute(
      `INSERT INTO backup_settings (setting_key, setting_value)
       VALUES ('backup_schedule', ?), ('backup_retention', ?), ('backup_time', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [schedule, String(retention), time]
    );
    applySchedule(schedule, time);
    return reply.send({ success: true, message: 'Schedule saved.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Failed to save schedule.' });
  }
}