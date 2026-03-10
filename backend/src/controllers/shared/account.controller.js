// backend/src/controllers/shared/account.controller.js
import bcrypt from 'bcryptjs';
import db from '../../config/db.js';

export async function changePassword(request, reply) {
  const { current_password, new_password } = request.body;
  const userId = request.user.id;
  try {
    const [rows] = await db.execute(`SELECT password_hash FROM users WHERE id = ?`, [userId]);
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