// backend/src/controllers/admin/backup.controller.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import mysql from 'mysql2/promise';
import db from '../../config/db.js';

const execAsync = promisify(exec);

const BASE_DIR = path.resolve(
  process.cwd(),
  process.env.BACKUP_DIR || '../backups/Tesda-Registration-Backups'
);

function typeDir(type)             { return path.join(BASE_DIR, type); }
function monthDir(type, date = new Date()) {
  const month = date.toLocaleString('en-US', { month: 'short' });
  return path.join(typeDir(type), `${month}-${date.getFullYear()}`);
}
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

['auto', 'manual', 'imports'].forEach(t => ensureDir(typeDir(t)));

function cleanupStaleTmpFiles() {
  try {
    const files = fs.readdirSync(BASE_DIR).filter(f => f.endsWith('.tmp'));
    files.forEach(f => {
      try { fs.unlinkSync(path.join(BASE_DIR, f)); } catch {}
    });
    if (files.length) console.log(`Cleaned up ${files.length} stale .tmp preview file(s).`);
  } catch {}
}
cleanupStaleTmpFiles();
console.log(`[Backup] BASE_DIR resolved to: ${BASE_DIR}`);

function getDbConfig() {
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
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

function makeFilename(type, suffix = '') {
  const ts  = new Date().toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19);
  const tag = suffix ? `_${suffix}` : (type === 'manual' ? '_manual' : '');
  return `backup_${ts}${tag}.sql`;
}

function listAllBackups() {
  const results = [];
  for (const type of ['auto', 'manual', 'imports']) {
    const tDir = typeDir(type);
    if (!fs.existsSync(tDir)) continue;
    for (const monthFolder of fs.readdirSync(tDir)) {
      const mDir = path.join(tDir, monthFolder);
      if (!fs.statSync(mDir).isDirectory()) continue;
      for (const file of fs.readdirSync(mDir)) {
        if (!file.endsWith('.sql')) continue;
        const filepath = path.join(mDir, file);
        const stat     = fs.statSync(filepath);
        results.push({
          name: file, relative: `${type}/${monthFolder}/${file}`,
          type, month_folder: monthFolder,
          size: formatSize(stat.size), size_bytes: stat.size,
          created_at: stat.birthtime, filepath,
        });
      }
    }
  }
  return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function findBackup(relative) {
  const parts = relative.split('/');
  if (parts.length !== 3) return null;
  const [type, month, name] = parts;
  if (!['auto', 'manual', 'imports'].includes(type)) return null;
  if (name.includes('..')) return null;
  const filepath = path.join(BASE_DIR, type, month, name);
  return fs.existsSync(filepath) ? { filepath, name } : null;
}

async function auditLog(req, action, details) {
  try {
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [req.user?.id ?? null, req.user?.full_name ?? 'System', action, 'Backup', details, req.ip ?? null]
    );
  } catch (err) { console.error('Audit log failed:', err.message); }
}

const TRACKED_TABLES = [
  { name: 'registration', pk: 'id', label: 'Applicants',  critical: true  },
  { name: 'reports',      pk: 'id', label: 'Reports',     critical: true  },
  { name: 'courses',      pk: 'id', label: 'Courses',     critical: false },
  { name: 'sectors',      pk: 'id', label: 'Sectors',     critical: false },
  { name: 'users',        pk: 'id', label: 'Users',       critical: false },
];

function mysqldumpCli(cfg) {
  const pw = cfg.password ? `-p${cfg.password}` : '';
  return `"${path.join(cfg.bin, 'mysqldump')}" -h ${cfg.host} -P ${cfg.port} -u ${cfg.user} ${pw}`;
}

const TEMP_DB = 'tesda_import_preview_tmp';

async function getRootConn() {
  const cfg = getDbConfig();
  return mysql.createConnection({
    host:     cfg.host,
    port:     cfg.port,
    user:     cfg.user,
    password: cfg.password,
    timezone: '+08:00',
  });
}

export function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1] || '';

    if (!inString && !inComment && !inLineComment && ch === '-' && next === '-') {
      inLineComment = true; current += ch; i++; continue;
    }
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      current += ch; i++; continue;
    }
    if (!inString && !inComment && ch === '/' && next === '*') {
      inComment = true; current += ch + next; i += 2; continue;
    }
    if (inComment) {
      current += ch;
      if (ch === '*' && next === '/') { current += next; inComment = false; i += 2; continue; }
      i++; continue;
    }
    if (!inString && (ch === "\'" || ch === '"' || ch === '`')) {
      inString = true; stringChar = ch; current += ch; i++; continue;
    }
    if (inString) {
      if (ch === '\\') { current += ch + (sql[i + 1] || ''); i += 2; continue; }
      if (ch === stringChar) inString = false;
      current += ch; i++; continue;
    }
    if (ch === ';') {
      const stmt = current.trim();
      if (stmt.length > 0) statements.push(stmt);
      current = ''; i++; continue;
    }
    current += ch; i++;
  }
  const last = current.trim();
  if (last.length > 0) statements.push(last);
  return statements;
}

async function loadSqlFileIntoDbPure(conn, sqlFilePath, targetDb) {
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  const statements = splitSqlStatements(sqlContent);

  console.log(`[loadSqlPure] Splitting into ${statements.length} statements`);

  await conn.query(`USE \`${targetDb}\``);
  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  await conn.query('SET UNIQUE_CHECKS=0');

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();
    if (upper.startsWith('USE ')) {
      console.log(`[loadSqlPure] Skipping USE statement: ${trimmed.substring(0, 60)}`);
      continue;
    }
    if (upper.startsWith('CREATE DATABASE') || upper.startsWith('DROP DATABASE')) {
      console.log(`[loadSqlPure] Skipping DB-level statement: ${trimmed.substring(0, 60)}`);
      continue;
    }
    try {
      await conn.query(trimmed);
    } catch (err) {
      console.warn(`[loadSqlPure] Statement failed (continuing):`, err.message.substring(0, 200));
    }
  }

  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.query('SET UNIQUE_CHECKS=1');

  try {
    const [[{ count }]] = await conn.query(
      `SELECT COUNT(*) AS count FROM \`${targetDb}\`.\`registration\``
    );
    console.log(`[loadSqlPure] registration rows loaded: ${count}`);
  } catch (err) {
    console.warn(`[loadSqlPure] Could not count registration rows:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMESTAMP COMPARISON HELPER
// Returns:
//   'import_newer'  → import updated_at is strictly newer → safe to update
//   'live_newer'    → live updated_at is strictly newer   → block (live is more recent)
//   'conflict'      → both differ but can't determine winner (same ts, or no ts column)
// ─────────────────────────────────────────────────────────────────────────────
function resolveConflict(liveRow, importRow, columns) {
  const hasTs = columns.includes('updated_at');
  if (!hasTs) return 'conflict'; // No timestamp — can never safely auto-resolve

  const liveTs   = liveRow.updated_at   ? new Date(liveRow.updated_at).getTime()   : 0;
  const importTs = importRow.updated_at ? new Date(importRow.updated_at).getTime() : 0;

  if (importTs > liveTs)  return 'import_newer';
  if (liveTs  > importTs) return 'live_newer';
  return 'conflict'; // Same timestamp but data differs — flag it
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFF ENGINE
// ─────────────────────────────────────────────────────────────────────────────
async function computeDiff(sqlFilePath) {
  const cfg  = getDbConfig();
  const diff = {};
  const conn = await getRootConn();

  try {
    console.log(`[Diff] Starting diff for: ${sqlFilePath}`);

    await conn.execute(`DROP DATABASE IF EXISTS \`${TEMP_DB}\``);
    await conn.execute(`CREATE DATABASE \`${TEMP_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await loadSqlFileIntoDbPure(conn, sqlFilePath, TEMP_DB);

    const [loadedTables] = await conn.execute(
      `SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [TEMP_DB]
    );
    console.log(`[Diff] Temp DB tables:`, loadedTables.map(t => `${t.TABLE_NAME}(~${t.TABLE_ROWS})`).join(', '));

    const [regCount] = await conn.execute(`SELECT COUNT(*) as c FROM \`${TEMP_DB}\`.\`registration\``).catch(() => [[{c:0}]]);
    console.log(`[Diff] ACTUAL registration rows in temp DB: ${regCount[0].c}`);

    for (const { name, pk, label, critical } of TRACKED_TABLES) {
      // modified is now split into three sub-buckets:
      //   allowed   → import is newer, safe to apply
      //   skipped   → live is newer, block silently
      //   conflicted → same timestamp or no timestamp, need admin awareness
      const added      = [];
      const modified   = { allowed: [], skipped: [], conflicted: [] };
      const deleted    = [];

      const [[tmpT]]  = await conn.execute(
        `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
        [TEMP_DB, name]
      );
      const [[liveT]] = await conn.execute(
        `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
        [cfg.name, name]
      );

      const inTmp  = Number(tmpT.c)  > 0;
      const inLive = Number(liveT.c) > 0;

      console.log(`[Diff] Table "${name}": inTmp=${inTmp}, inLive=${inLive}`);

      if (!inTmp && !inLive) { diff[name] = { label, critical, added, modified, deleted }; continue; }

      const schemaDb = inLive ? cfg.name : TEMP_DB;
      const [cols] = await conn.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
        [schemaDb, name]
      );
      const columns = cols.map(c => c.COLUMN_NAME);

      const [liveRows] = inLive ? await conn.execute(`SELECT * FROM \`${cfg.name}\`.\`${name}\``) : [[]];
      const [tmpRows]  = inTmp  ? await conn.execute(`SELECT * FROM \`${TEMP_DB}\`.\`${name}\``)  : [[]];

      console.log(`[Diff] "${name}": liveRows=${liveRows.length}, tmpRows=${tmpRows.length}`);

      const liveMap = new Map(liveRows.map(r => [String(r[pk]), r]));
      const tmpMap  = new Map(tmpRows.map(r  => [String(r[pk]), r]));

      for (const [id, tmpRow] of tmpMap) {
        if (!liveMap.has(id)) {
          // Genuinely new record — safe to insert
          added.push({ id, preview: summariseRow(tmpRow, name), row: tmpRow });
        } else {
          const changes = diffRow(liveMap.get(id), tmpRow, columns);
          if (changes.length) {
            const resolution = resolveConflict(liveMap.get(id), tmpRow, columns);
            const entry = {
              id,
              changes,
              preview:    summariseRow(tmpRow, name),
              row:        tmpRow,
              liveRow:    liveMap.get(id),
              resolution, // 'import_newer' | 'live_newer' | 'conflict'
            };
            if (resolution === 'import_newer')  modified.allowed.push(entry);
            else if (resolution === 'live_newer') modified.skipped.push(entry);
            else                                  modified.conflicted.push(entry);
          }
        }
      }

      for (const [id, liveRow] of liveMap) {
        if (!tmpMap.has(id)) deleted.push({ id, preview: summariseRow(liveRow, name), row: liveRow });
      }

      const totalMod = modified.allowed.length + modified.skipped.length + modified.conflicted.length;
      console.log(`[Diff] "${name}": added=${added.length}, modified(allowed=${modified.allowed.length} skipped=${modified.skipped.length} conflicted=${modified.conflicted.length}), deleted=${deleted.length}`);
      diff[name] = { label, critical, added, modified, deleted };
    }
  } finally {
    await conn.execute(`DROP DATABASE IF EXISTS \`${TEMP_DB}\``).catch(() => {});
    await conn.end().catch(() => {});
  }

  return diff;
}

function diffRow(live, incoming, columns) {
  const changes = [];
  for (const key of columns) {
    if (key === 'updated_at' || key === 'created_at') continue;
    const lv = live[key]     == null ? null : String(live[key]);
    const iv = incoming[key] == null ? null : String(incoming[key]);
    if (lv !== iv) changes.push({ field: key, from: lv, to: iv });
  }
  return changes;
}

function summariseRow(row, table) {
  if (table === 'registration') {
    const name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
    const parts = [
      name || row.uli_number,
      row.course_qualification,
      row.sex,
      row.address_city,
      row.status,
    ].filter(Boolean);
    return parts.join(' | ');
  }
  if (table === 'reports') {
    const parts = [
      row.title,
      row.program_title,
      row.provider_name,
      row.delivery_mode,
      row.status,
    ].filter(Boolean);
    return parts.join(' | ');
  }
  if (table === 'courses') {
    return [row.name, row.sector].filter(Boolean).join(' | ');
  }
  if (table === 'sectors') {
    return row.name || String(row.id);
  }
  if (table === 'users') {
    return [row.full_name || row.username, row.role].filter(Boolean).join(' | ');
  }
  if (table === 'report_trainees') {
    const parts = [
      `Report #${row.report_id}`,
      row.client_type,
      row.date_started ? `Started: ${row.date_started}` : null,
      row.date_finished ? `Finished: ${row.date_finished}` : null,
      row.assessment_results,
    ].filter(Boolean);
    return parts.join(' | ');
  }
  return String(row.id ?? '?');
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART MERGE
// apply_updates: if true, apply 'allowed' (import_newer) records
// apply_deletes: if true, delete records only in live DB
// 'skipped' and 'conflicted' records are NEVER touched regardless of flags
// ─────────────────────────────────────────────────────────────────────────────
async function applySmartMerge(sqlFilePath, applyDeletes = false, applyUpdates = false) {
  const cfg     = getDbConfig();
  const results = {};
  const conn    = await getRootConn();

  try {
    await conn.execute(`DROP DATABASE IF EXISTS \`${TEMP_DB}\``);
    await conn.execute(`CREATE DATABASE \`${TEMP_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await loadSqlFileIntoDbPure(conn, sqlFilePath, TEMP_DB);

    for (const { name, pk } of TRACKED_TABLES) {
      let inserted = 0, updated = 0, deleted = 0, skipped = 0;

      const [[tmpT]] = await conn.execute(
        `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
        [TEMP_DB, name]
      );
      if (!Number(tmpT.c)) { results[name] = { inserted, updated, deleted, skipped }; continue; }

      const [cols] = await conn.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
        [TEMP_DB, name]
      );
      const columns = cols.map(c => c.COLUMN_NAME);

      const [tmpRows]  = await conn.execute(`SELECT * FROM \`${TEMP_DB}\`.\`${name}\``);
      const [liveRows] = await conn.execute(`SELECT * FROM \`${cfg.name}\`.\`${name}\``).catch(() => [[]]);

      const liveMap = new Map(liveRows.map(r => [String(r[pk]), r]));

      for (const tmpRow of tmpRows) {
        const id = String(tmpRow[pk]);

        if (!liveMap.has(id)) {
          // New record — always insert
          const colList      = columns.map(c => `\`${c}\``).join(', ');
          const placeholders = columns.map(() => '?').join(', ');
          const vals         = columns.map(c => tmpRow[c] ?? null);
          try {
            await conn.execute(
              `INSERT IGNORE INTO \`${cfg.name}\`.\`${name}\` (${colList}) VALUES (${placeholders})`,
              vals
            );
            inserted++;
          } catch (e) { console.warn(`Merge insert skip (${name}#${id}):`, e.message); }
        } else {
          const changes = diffRow(liveMap.get(id), tmpRow, columns);
          if (changes.length) {
            const resolution = resolveConflict(liveMap.get(id), tmpRow, columns);

            if (resolution === 'import_newer' && applyUpdates) {
              // Safe update — import is newer
              const setPairs = columns.filter(c => c !== pk).map(c => `\`${c}\` = ?`).join(', ');
              const setVals  = columns.filter(c => c !== pk).map(c => tmpRow[c] ?? null);
              try {
                await conn.execute(
                  `UPDATE \`${cfg.name}\`.\`${name}\` SET ${setPairs} WHERE \`${pk}\` = ?`,
                  [...setVals, id]
                );
                updated++;
              } catch (e) { console.warn(`Merge update skip (${name}#${id}):`, e.message); }
            } else {
              // live_newer → always skip
              // conflicted → always skip
              // import_newer but applyUpdates=false → skip (user didn't opt in)
              skipped++;
              console.log(`[Merge] Skipping ${name}#${id} (resolution=${resolution}, applyUpdates=${applyUpdates})`);
            }
          }
        }
      }

      if (applyDeletes) {
        const tmpMap = new Map(tmpRows.map(r => [String(r[pk]), r]));
        for (const [id] of liveMap) {
          if (!tmpMap.has(id)) {
            try {
              await conn.execute(`DELETE FROM \`${cfg.name}\`.\`${name}\` WHERE \`${pk}\` = ?`, [id]);
              deleted++;
            } catch (e) { console.warn(`Merge delete skip (${name}#${id}):`, e.message); }
          }
        }
      }

      results[name] = { inserted, updated, deleted, skipped };
    }
  } finally {
    await conn.execute(`DROP DATABASE IF EXISTS \`${TEMP_DB}\``).catch(() => {});
    await conn.end().catch(() => {});
  }

  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

export async function listBackups(_request, reply) {
  try {
    const files = listAllBackups().map(({ filepath, ...rest }) => rest);
    return reply.send({ success: true, data: files });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Failed to list backups.' });
  }
}

export async function createBackup(request, reply) {
  const cfg      = getDbConfig();
  const now      = new Date();
  const dir      = monthDir('manual', now);
  ensureDir(dir);
  const filename = makeFilename('manual');
  const outPath  = path.join(dir, filename);

  try {
    const cmd = `${mysqldumpCli(cfg)} --result-file="${outPath}" ${cfg.name}`;
    console.log(`[Backup] Running command: ${cmd}`);
    const { stderr } = await execAsync(cmd, { shell: true });
    if (stderr) console.warn(`[Backup] mysqldump stderr: ${stderr}`);

    if (!fs.existsSync(outPath))
      return reply.code(500).send({ success: false, message: 'Backup file was not created.' });

    const stat = fs.statSync(outPath);
    console.log(`[Backup] File created: ${outPath} (${stat.size} bytes)`);

    if (stat.size === 0) {
      fs.unlinkSync(outPath);
      return reply.code(500).send({ success: false, message: 'Backup file is empty — mysqldump may have failed silently.' });
    }

    await auditLog(request, 'CREATE_BACKUP', `Created: ${filename}`);
    return reply.code(201).send({
      success: true,
      data: {
        name: filename,
        relative: `manual/${now.toLocaleString('en-US',{month:'short'})}-${now.getFullYear()}/${filename}`,
        size: formatSize(stat.size), created_at: stat.birthtime, type: 'manual',
      },
      message: 'Backup created successfully.',
    });
  } catch (err) {
    console.error(`[Backup] FAILED:`, err.message);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    return reply.code(500).send({ success: false, message: 'Backup failed: ' + err.message });
  }
}

export async function downloadBackup(request, reply) {
  const relative = decodeURIComponent(request.params['*'] || '');
  const found    = findBackup(relative);
  if (!found) return reply.code(404).send({ success: false, message: 'Backup not found.' });
  const stream = fs.createReadStream(found.filepath);
  reply.header('Content-Disposition', `attachment; filename="${found.name}"`);
  reply.header('Content-Type', 'application/octet-stream');
  return reply.send(stream);
}

export async function deleteBackup(request, reply) {
  const relative = decodeURIComponent(request.params['*'] || '');
  const found    = findBackup(relative);
  if (!found) return reply.code(404).send({ success: false, message: 'Backup not found.' });
  try {
    fs.unlinkSync(found.filepath);
    await auditLog(request, 'DELETE_BACKUP', `Deleted: ${relative}`);
    return reply.send({ success: true, message: 'Backup deleted.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Failed to delete backup.' });
  }
}

export async function previewImport(request, reply) {
  console.log('[Preview] Handler reached, content-type:', request.headers['content-type']);
  const data = await request.file();
  console.log('[Preview] File received:', data?.filename, data?.mimetype);

  if (!data || !data.filename.endsWith('.sql')) {
    return reply.code(400).send({ success: false, message: 'A valid .sql file is required.' });
  }

  const tmpId   = `preview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpPath = path.join(BASE_DIR, `${tmpId}.tmp`);

  try {
    const buffer = await data.toBuffer();
    fs.writeFileSync(tmpPath, buffer);
    console.log(`[Preview] Saved upload to: ${tmpPath} (${buffer.length} bytes)`);

    const diff = await computeDiff(tmpPath);

    // Auto-delete after 5 min if user never confirms
    setTimeout(() => { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); }, 5 * 60 * 1000);

    return reply.send({ success: true, token: tmpId, filename: data.filename, diff });
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Preview failed: ' + err.message });
  }
}

export async function confirmImport(request, reply) {
  const {
    token,
    filename,
    apply_deletes = false,
    apply_updates = false, // NEW — opt-in to apply 'import_newer' records
  } = request.body || {};

  if (!token || !/^preview_\d+_[a-z0-9]+$/.test(token)) {
    return reply.code(400).send({ success: false, message: 'Invalid or missing token.' });
  }

  const tmpPath = path.join(BASE_DIR, `${token}.tmp`);
  if (!fs.existsSync(tmpPath)) {
    return reply.code(410).send({ success: false, message: 'Preview session expired. Please re-upload.' });
  }

  const cfg = getDbConfig();
  const now = new Date();

  // Pre-import safety backup
  const preDir  = monthDir('auto', now);
  ensureDir(preDir);
  const prePath = path.join(preDir, makeFilename('auto', 'pre-import'));
  await execAsync(`${mysqldumpCli(cfg)} --result-file="${prePath}" ${cfg.name}`, { shell: true }).catch(() => {});

  try {
    const results = await applySmartMerge(tmpPath, apply_deletes, apply_updates);

    const impDir  = monthDir('imports', now);
    ensureDir(impDir);
    const impName = `import_${now.toISOString().replace('T','_').replace(/:/g,'-').slice(0,19)}_${(filename||'unknown').replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    fs.copyFileSync(tmpPath, path.join(impDir, impName));
    fs.unlinkSync(tmpPath);

    await auditLog(
      request,
      'IMPORT_MERGE',
      `Smart merge from: ${filename} | apply_deletes: ${apply_deletes} | apply_updates: ${apply_updates}`
    );

    return reply.send({ success: true, message: 'Smart merge applied successfully.', results });
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Merge failed: ' + err.message });
  }
}

export async function restoreBackup(request, reply) {
  return reply.code(400).send({
    success: false,
    message: 'Direct restore is disabled. Use the Preview Import → Confirm flow.',
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCHEDULER
// ══════════════════════════════════════════════════════════════════════════════

async function runScheduledBackup() {
  const cfg      = getDbConfig();
  const now      = new Date();
  const dir      = monthDir('auto', now);
  ensureDir(dir);
  const filename = makeFilename('auto');
  const outPath  = path.join(dir, filename);

  try {
    await execAsync(`${mysqldumpCli(cfg)} --result-file="${outPath}" ${cfg.name}`, { shell: true });
    console.log(`Scheduled backup: ${filename}`);

    const [rows] = await db.execute(`SELECT setting_value FROM backup_settings WHERE setting_key = 'backup_retention'`);
    const retentionDays = parseInt(rows[0]?.setting_value) || 14;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const autoDir = typeDir('auto');
    if (fs.existsSync(autoDir)) {
      for (const month of fs.readdirSync(autoDir)) {
        const mDir = path.join(autoDir, month);
        if (!fs.statSync(mDir).isDirectory()) continue;
        for (const file of fs.readdirSync(mDir)) {
          if (!file.endsWith('.sql')) continue;
          const fp = path.join(mDir, file);
          if (fs.statSync(fp).birthtime < cutoff) { fs.unlinkSync(fp); }
        }
        if (!fs.readdirSync(mDir).length) fs.rmdirSync(mDir);
      }
    }
  } catch (err) {
    console.error('Scheduled backup failed:', err.message);
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  }
}

let currentCronJob = null;

export function applySchedule(schedule, time = '02:00') {
  if (currentCronJob) { currentCronJob.stop(); currentCronJob = null; }
  const [hour, minute] = time.split(':');
  const cronExpr = schedule === 'weekly' ? `${minute} ${hour} * * 0` : `${minute} ${hour} * * *`;
  currentCronJob = cron.schedule(cronExpr, runScheduledBackup, { timezone: 'Asia/Manila' });
  console.log(`Backup schedule: ${schedule} at ${time} (${cronExpr})`);
}

setInterval(cleanupStaleTmpFiles, 60 * 60 * 1000);

export async function loadAndStartScheduler() {
  try {
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value FROM backup_settings WHERE setting_key IN ('backup_schedule','backup_retention','backup_time')`
    );
    const map = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
    applySchedule(map.backup_schedule || 'daily', map.backup_time || '02:00');
  } catch { applySchedule('daily', '02:00'); }
}

export async function getSchedule(_request, reply) {
  try {
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value FROM backup_settings WHERE setting_key IN ('backup_schedule','backup_retention','backup_time')`
    );
    const map = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
    return reply.send({ success: true, data: { schedule: map.backup_schedule || 'daily', retention: parseInt(map.backup_retention) || 14, time: map.backup_time || '02:00' } });
  } catch {
    return reply.send({ success: true, data: { schedule: 'daily', retention: 14, time: '02:00' } });
  }
}

export async function saveSchedule(request, reply) {
  const { schedule, retention, time = '02:00' } = request.body;
  if (!['daily', 'weekly'].includes(schedule))
    return reply.code(400).send({ success: false, message: 'Invalid schedule.' });
  if (retention < 7 || retention > 90)
    return reply.code(400).send({ success: false, message: 'Retention must be 7–90 days.' });
  try {
    await db.execute(
      `INSERT INTO backup_settings (setting_key, setting_value)
       VALUES ('backup_schedule',?),('backup_retention',?),('backup_time',?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [schedule, String(retention), time]
    );
    applySchedule(schedule, time);
    await auditLog(request, 'UPDATE_SCHEDULE', `schedule=${schedule}, retention=${retention}d, time=${time}`);
    return reply.send({ success: true, message: 'Schedule saved.' });
  } catch {
    return reply.code(500).send({ success: false, message: 'Failed to save schedule.' });
  }
}