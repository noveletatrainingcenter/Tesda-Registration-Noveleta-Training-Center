import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import { generateEmployeeId, sanitize } from '../utils/helpers.js';

// Get all users
export async function getUsers(request, reply) {
  try {
    const [rows] = await db.execute(
      `SELECT id, username, email, role, full_name, is_active, last_login, created_at FROM users ORDER BY created_at DESC`
    );
    return reply.send({ success: true, data: rows });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Create user
export async function createUser(request, reply) {
  const { username, email, password, role, full_name, security_question, security_answer } = request.body;
  try {
    // Get next sequence
    const year = new Date().getFullYear();
    const [[{ count }]] = await db.execute(
      `SELECT COUNT(*) as count FROM users WHERE id LIKE '${year}%'`
    );
    const id = generateEmployeeId(year, count + 1);

    const hash = await bcrypt.hash(password, 10);
    const secHash = security_answer ? await bcrypt.hash(security_answer.toLowerCase().trim(), 10) : null;

    await db.execute(
      `INSERT INTO users (id, username, email, password_hash, role, full_name, security_question, security_answer_hash) VALUES (?,?,?,?,?,?,?,?)`,
      [id, sanitize(username), sanitize(email), hash, role, sanitize(full_name), security_question || null, secHash]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'CREATE_USER', 'User Management', `Created user: ${username} (${role})`, request.ip]
    );

    return reply.code(201).send({ success: true, id, message: `User created. Employee ID: ${id}` });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return reply.code(409).send({ success: false, message: 'Username or email already exists.' });
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Toggle user active status
export async function toggleUserStatus(request, reply) {
  const { id } = request.params;
  if (id === request.user.id) return reply.code(400).send({ success: false, message: 'Cannot deactivate your own account.' });
  try {
    await db.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'TOGGLE_USER', 'User Management', `Toggled user: ${id}`, request.ip]
    );
    return reply.send({ success: true, message: 'User status updated.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Get audit logs
export async function getAuditLogs(request, reply) {
  const { page = 1, limit = 20, user_id, module } = request.query;
  const offset = (page - 1) * limit;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (user_id) { where += ' AND user_id = ?'; params.push(user_id); }
    if (module) { where += ' AND module = ?'; params.push(module); }

    const [rows] = await db.execute(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) as total FROM audit_logs ${where}`, params);

    return reply.send({ success: true, data: rows, total, page: parseInt(page) });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Get courses
export async function getCourses(request, reply) {
  try {
    const [rows] = await db.execute('SELECT * FROM courses ORDER BY name ASC');
    return reply.send({ success: true, data: rows });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Create course
export async function createCourse(request, reply) {
  const { name, code, sector } = request.body;
  try {
    await db.execute('INSERT INTO courses (name, code, sector) VALUES (?,?,?)', [name, code, sector]);
    return reply.code(201).send({ success: true, message: 'Course added.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Update user password (admin self or target)
export async function changePassword(request, reply) {
  const { current_password, new_password } = request.body;
  const userId = request.user.id;
  try {
    const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!rows.length) return reply.code(404).send({ success: false, message: 'User not found.' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return reply.code(401).send({ success: false, message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    return reply.send({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}
