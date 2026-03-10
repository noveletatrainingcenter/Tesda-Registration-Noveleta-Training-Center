// backend/src/controllers/admin/users.controller.js
import bcrypt from 'bcryptjs';
import db from '../../config/db.js';
import { generateEmployeeId } from '../../utils/helpers.js';

export async function getUsers(request, reply) {
  try {
    const [rows] = await db.execute(
      `SELECT id, username, email, role, full_name, is_active, last_login, created_at
       FROM users ORDER BY created_at DESC`
    );
    return reply.send({ success: true, data: rows });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function createUser(request, reply) {
  const { username, email, password, role, full_name, security_question, security_answer } = request.body;
  if (!username || !password || !full_name) {
    return reply.code(400).send({ success: false, message: 'Username, password, and full name are required.' });
  }
  try {
    const year = new Date().getFullYear();
    const [[{ count }]] = await db.execute(
      `SELECT COUNT(*) as count FROM users WHERE id LIKE '${year}%'`
    );
    const employeeId = generateEmployeeId(year, count + 1);

    const hash = await bcrypt.hash(password, 10);
    const answerHash = security_answer ? await bcrypt.hash(security_answer.toLowerCase().trim(), 10) : null;

    await db.execute(
      `INSERT INTO users (id, username, email, password_hash, role, full_name, security_question, security_answer_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, username, email || null, hash, role || 'encoder', full_name,
       security_question || null, answerHash]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'CREATE_USER', 'UserManagement', `Created: ${full_name} (${role})`, request.ip]
    );

    return reply.code(201).send({ success: true, id: employeeId, message: 'User created successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return reply.code(409).send({ success: false, message: 'Username or email already exists.' });
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function toggleUserStatus(request, reply) {
  const { id } = request.params;
  try {
    await db.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'TOGGLE_USER', 'UserManagement', `Toggled user ID: ${id}`, request.ip]
    );
    return reply.send({ success: true, message: 'User status toggled.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}