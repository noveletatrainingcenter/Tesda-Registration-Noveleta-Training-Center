// backend/src/controllers/admin/users.controller.js
import bcrypt from 'bcryptjs';
import db from '../../config/db.js';
import { generateEmployeeId } from '../../utils/helpers.js';

export async function getUsers(request, reply) {
  const { limit = 15, page = 1, search } = request.query;
  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const params     = [];

    if (search) {
      conditions.push('(full_name LIKE ? OR username LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM users ${where}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT id, username, role, full_name, email, is_active, last_login, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return reply.send({
      success: true,
      data:   rows,
      total:  total,
      pages:  Math.ceil(total / limitNum) || 1,
      page:   pageNum,
    });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function createUser(request, reply) {
  const { username, password, role, full_name, email, security_question, security_answer } = request.body;
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
      `INSERT INTO users (id, username, password_hash, role, full_name, email, security_question, security_answer_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, username, hash, role || 'encoder', full_name,
       email || null, security_question || null, answerHash]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'CREATE_USER', 'UserManagement', `Created: ${full_name} (${role})`, request.ip]
    );

    return reply.code(201).send({ success: true, id: employeeId, message: 'User created successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return reply.code(409).send({ success: false, message: 'Username already exists.' });
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function toggleUserStatus(request, reply) {
  const { id } = request.params;
  try {
    const [[target]] = await db.execute(
      'SELECT role, is_active FROM users WHERE id = ?',
      [id]
    );

    if (!target) {
      return reply.code(404).send({ success: false, message: 'User not found.' });
    }

    if (target.role === 'admin' && target.is_active) {
      const [[{ activeAdminCount }]] = await db.execute(
        `SELECT COUNT(*) as activeAdminCount FROM users WHERE role = 'admin' AND is_active = 1`
      );
      if (activeAdminCount <= 1) {
        return reply.code(400).send({
          success: false,
          message: 'Cannot disable the last active admin account. Create another admin account first.',
        });
      }
    }

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

export async function updateUser(request, reply) {
  const { id } = request.params;
  const { username, password, full_name, email, role, security_question, security_answer } = request.body;

  try {
    const [[target]] = await db.execute(
      'SELECT id, role, is_active FROM users WHERE id = ?',
      [id]
    );
    if (!target) {
      return reply.code(404).send({ success: false, message: 'User not found.' });
    }

    // Guard: cannot demote the last active admin to encoder
    if (role && role !== 'admin' && target.role === 'admin' && target.is_active) {
      const [[{ activeAdminCount }]] = await db.execute(
        `SELECT COUNT(*) as activeAdminCount FROM users WHERE role = 'admin' AND is_active = 1`
      );
      if (activeAdminCount <= 1) {
        return reply.code(400).send({
          success: false,
          message: 'Cannot change the role of the last active admin. Create another admin account first.',
        });
      }
    }

    // Check username uniqueness (excluding current user)
    if (username) {
      const [[conflict]] = await db.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, id]
      );
      if (conflict) {
        return reply.code(409).send({ success: false, message: 'Username already taken.' });
      }
    }

    const fields = [];
    const params = [];

    if (full_name)  { fields.push('full_name = ?');   params.push(full_name); }
    if (username)   { fields.push('username = ?');    params.push(username); }
    if (role)       { fields.push('role = ?');        params.push(role); }

    if (email !== undefined) {
      fields.push('email = ?');
      params.push(email || null);
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      params.push(hash);
    }

    if (security_question !== undefined) {
      fields.push('security_question = ?');
      params.push(security_question || null);
    }

    if (security_answer) {
      const answerHash = await bcrypt.hash(security_answer.toLowerCase().trim(), 10);
      fields.push('security_answer_hash = ?');
      params.push(answerHash);
    }

    if (fields.length === 0) {
      return reply.code(400).send({ success: false, message: 'No fields to update.' });
    }

    params.push(id);
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [
        request.user.id,
        request.user.full_name,
        'UPDATE_USER',
        'UserManagement',
        `Updated user ID: ${id} (${full_name || target.id})`,
        request.ip,
      ]
    );

    return reply.send({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ success: false, message: 'Username already exists.' });
    }
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

// HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER

export async function getUserStats(request, reply) {
  try {
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) as total FROM users`);
    
    const [[{ active }]] = await db.execute(
      `SELECT COUNT(*) as active FROM users WHERE is_active = 1`
    );
    
    const [[{ inactive }]] = await db.execute(
      `SELECT COUNT(*) as inactive FROM users WHERE is_active = 0`
    );
    
    const [[{ admins }]] = await db.execute(
      `SELECT COUNT(*) as admins FROM users WHERE role = 'admin'`
    );
    
    const [[{ encoders }]] = await db.execute(
      `SELECT COUNT(*) as encoders FROM users WHERE role = 'encoder'`
    );

    return reply.send({
      total,
      active,
      inactive,
      admins,
      encoders
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}