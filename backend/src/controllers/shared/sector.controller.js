// backend/src/controllers/shared/sector.controller.js
import db from '../../config/db.js';
import { sanitize } from '../../utils/helpers.js';

export async function getSectors(request, reply) {
  const { includeInactive = false } = request.query;
  try {
    const where = includeInactive === 'true' ? '' : 'WHERE is_active = 1';
    const [rows] = await db.execute(
      `SELECT * FROM sectors ${where} ORDER BY name ASC`
    );
    return reply.send({ success: true, data: rows });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function createSector(request, reply) {
  const { name } = request.body;
  if (!name?.trim()) return reply.code(400).send({ success: false, message: 'Name is required.' });

  try {
    const [result] = await db.execute(
      'INSERT INTO sectors (name, created_by) VALUES (?, ?)',
      [sanitize(name), request.user.id]
    );
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'CREATE_SECTOR', 'Sectors', `Created: ${name}`, request.ip]
    );
    return reply.code(201).send({ success: true, id: result.insertId, message: 'Sector created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return reply.code(409).send({ success: false, message: 'Sector already exists.' });
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function updateSector(request, reply) {
  const { id } = request.params;
  const { name } = request.body;
  if (!name?.trim()) return reply.code(400).send({ success: false, message: 'Name is required.' });

  try {
    await db.execute('UPDATE sectors SET name = ? WHERE id = ?', [sanitize(name), id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'UPDATE_SECTOR', 'Sectors', `Updated ID: ${id} → ${name}`, request.ip]
    );
    return reply.send({ success: true, message: 'Sector updated.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return reply.code(409).send({ success: false, message: 'Sector name already exists.' });
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function toggleSector(request, reply) {
  const { id } = request.params;
  const { is_active } = request.body;
  try {
    await db.execute('UPDATE sectors SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'TOGGLE_SECTOR', 'Sectors',
       `Toggled ID: ${id} → ${is_active ? 'active' : 'inactive'}`, request.ip]
    );
    return reply.send({ success: true, message: 'Sector status updated.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function deleteSector(request, reply) {
  const { id } = request.params;
  try {
    const [[{ count }]] = await db.execute(
      `SELECT COUNT(*) as count FROM courses WHERE sector = (SELECT name FROM sectors WHERE id = ?)`,
      [id]
    );
    if (count > 0) return reply.code(409).send({ success: false, message: 'Cannot delete: this sector has connected courses.' });
    await db.execute('DELETE FROM sectors WHERE id = ?', [id]);
    await db.execute('INSERT INTO audit_logs (user_id,user_name,action,module,details,ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'DELETE_SECTOR', 'Sectors', `Deleted ID: ${id}`, request.ip]);
    return reply.send({ success: true, message: 'Sector deleted.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}