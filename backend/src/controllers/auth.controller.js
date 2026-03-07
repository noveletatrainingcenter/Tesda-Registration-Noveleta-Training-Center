// backend/src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { generateResetTicket } from '../utils/helpers.js';
import dayjs from 'dayjs';

// Step 1: Detect user by ID / username / email
export async function detectUser(request, reply) {
  const { identifier } = request.body;
  if (!identifier) return reply.code(400).send({ success: false, message: 'Identifier required.' });

  try {
    const [rows] = await db.execute(
      `SELECT id, username, email, role, full_name, is_active
       FROM users
       WHERE (id = ? OR username = ? OR email = ?) AND is_active = TRUE`,
      [identifier, identifier, identifier]
    );

    if (!rows.length) {
      return reply.code(404).send({ success: false, message: 'No account found with that ID, username, or email.' });
    }

    const user = rows[0];
    return reply.send({
      success: true,
      role: user.role,
      full_name: user.full_name,
      identifier_type: identifier.match(/^\d{9}$/) ? 'employee_id' : identifier.includes('@') ? 'email' : 'username',
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Step 2: Login
export async function login(request, reply) {
  const { identifier, password, remember_me } = request.body;
  if (!identifier || !password) {
    return reply.code(400).send({ success: false, message: 'Identifier and password required.' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT id, username, email, password_hash, role, full_name, is_active
       FROM users WHERE (id = ? OR username = ? OR email = ?)`,
      [identifier, identifier, identifier]
    );

    if (!rows.length || !rows[0].is_active) {
      return reply.code(401).send({ success: false, message: 'Invalid credentials or account deactivated.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ success: false, message: 'Incorrect password.' });
    }

    // Update last login
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Audit log
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, ip_address) VALUES (?,?,?,?,?)',
      [user.id, user.full_name, 'LOGIN', 'Auth', request.ip]
    );

    const expiresIn = remember_me ? '7d' : '8h';
    const token = request.server.jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      { expiresIn }
    );

    return reply.send({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, full_name: user.full_name }
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Logout
export async function logout(request, reply) {
  try {
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, ip_address) VALUES (?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'LOGOUT', 'Auth', request.ip]
    );
  } catch (_) {}
  return reply.send({ success: true, message: 'Logged out.' });
}

// Admin: Forgot password via email (send security question)
export async function getSecurityQuestion(request, reply) {
  const { email } = request.body;
  try {
    const [rows] = await db.execute(
      `SELECT security_question FROM users WHERE email = ? AND role = 'admin' AND is_active = TRUE`,
      [email]
    );
    if (!rows.length) return reply.code(404).send({ success: false, message: 'Admin email not found.' });
    return reply.send({ success: true, question: rows[0].security_question });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Admin: Answer security question & reset password
export async function adminResetPassword(request, reply) {
  const { email, answer, new_password } = request.body;
  try {
    const [rows] = await db.execute(
      `SELECT id, security_answer_hash FROM users WHERE email = ? AND role = 'admin'`,
      [email]
    );
    if (!rows.length) return reply.code(404).send({ success: false, message: 'Not found.' });

    const valid = await bcrypt.compare(answer.toLowerCase().trim(), rows[0].security_answer_hash);
    if (!valid) return reply.code(401).send({ success: false, message: 'Incorrect answer.' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, rows[0].id]);

    return reply.send({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Admin: Generate reset ticket for encoder
export async function generateEncoderTicket(request, reply) {
  const { encoder_id } = request.body;
  try {
    const [rows] = await db.execute(
      `SELECT id, full_name FROM users WHERE id = ? AND role = 'encoder'`,
      [encoder_id]
    );
    if (!rows.length) return reply.code(404).send({ success: false, message: 'Encoder not found.' });

    const ticket = generateResetTicket();
    const expires = dayjs().add(24, 'hour').toDate();

    await db.execute(
      'UPDATE users SET reset_ticket = ?, ticket_expires_at = ?, ticket_used = FALSE WHERE id = ?',
      [ticket, expires, encoder_id]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'GENERATE_RESET_TICKET', 'Auth', `Ticket for encoder: ${rows[0].full_name}`, request.ip]
    );

    return reply.send({ success: true, ticket, encoder_name: rows[0].full_name, expires_in: '24 hours' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// Encoder: Use reset ticket
export async function useResetTicket(request, reply) {
  const { identifier, ticket, new_password } = request.body;
  try {
    const [rows] = await db.execute(
      `SELECT id FROM users
       WHERE (id = ? OR username = ?) AND reset_ticket = ?
       AND ticket_expires_at > NOW() AND ticket_used = FALSE AND role = 'encoder'`,
      [identifier, identifier, ticket]
    );
    if (!rows.length) {
      return reply.code(400).send({ success: false, message: 'Invalid or expired reset ticket.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db.execute(
      'UPDATE users SET password_hash = ?, reset_ticket = NULL, ticket_used = TRUE WHERE id = ?',
      [hash, rows[0].id]
    );

    return reply.send({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}
