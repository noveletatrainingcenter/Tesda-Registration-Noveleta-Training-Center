// backend/src/controllers/shared/otp.controller.js
import db from '../../config/db.js';
import dayjs from 'dayjs';
import bcrypt from 'bcryptjs';

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/otp/send
// Body: { identifier }  — finds the user's email and returns masked email + otp to frontend for EmailJS
export async function sendOtp(request, reply) {
  const { identifier, email } = request.body;
  if (!email) return reply.code(400).send({ success: false, message: 'Email address required.' });

  try {
    const [rows] = await db.execute(
      `SELECT id, full_name, email, role, is_active
       FROM users
       WHERE (id = ? OR username = ?) AND is_active = TRUE`,
      [identifier, identifier]
    );

    if (!rows.length) {
      return reply.code(404).send({ success: false, message: 'No account found with that ID or username.' });
    }

    const user = rows[0];

    if (!user.email) {
      return reply.code(400).send({
        success: false,
        message: 'No email address linked to this account. Contact your administrator.',
      });
    }

    // Verify the entered email matches what's on record
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return reply.code(400).send({
        success: false,
        message: 'Email address does not match our records.',
      });
    }

    const otp = generateOtp();
    const expires = dayjs().add(10, 'minute').toDate();

    // Store OTP in DB (reuse reset_ticket columns logic but with new otp columns)
    await db.execute(
      `UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_used = FALSE WHERE id = ?`,
      [otp, expires, user.id]
    );

    // Mask email: ke***@gmail.com
    const [localPart, domain] = user.email.split('@');
    const maskedLocal = localPart.slice(0, 2) + '***';
    const maskedEmail = `${maskedLocal}@${domain}`;

    // Return OTP + email to frontend — EmailJS is called client-side
    return reply.send({
      success: true,
      otp,                        // frontend will send this via EmailJS
      to_email: user.email,       // actual email for EmailJS
      masked_email: maskedEmail,  // shown to user in UI
      full_name: user.full_name,
      expires_in: '10 minutes',
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// POST /api/auth/otp/verify
// Body: { identifier, otp }
export async function verifyOtp(request, reply) {
  const { identifier, otp } = request.body;
  if (!identifier || !otp) return reply.code(400).send({ success: false, message: 'Identifier and OTP required.' });

  try {
    const [rows] = await db.execute(
      `SELECT id FROM users
       WHERE (id = ? OR username = ?)
         AND otp_code = ?
         AND otp_expires_at > NOW()
         AND otp_used = FALSE
         AND is_active = TRUE`,
      [identifier, identifier, otp]
    );

    if (!rows.length) {
      return reply.code(400).send({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Mark OTP as used
    await db.execute(`UPDATE users SET otp_used = TRUE WHERE id = ?`, [rows[0].id]);

    return reply.send({ success: true });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function otpResetPassword(request, reply) {
  const { identifier, new_password } = request.body;
  if (!identifier || !new_password) {
    return reply.code(400).send({ success: false, message: 'Identifier and new password required.' });
  }
  try {
    const [rows] = await db.execute(
      `SELECT id, full_name FROM users
       WHERE (id = ? OR username = ?) AND otp_used = TRUE AND is_active = TRUE`,
      [identifier, identifier]
    );
    if (!rows.length) {
      return reply.code(400).send({ success: false, message: 'OTP not verified. Please start over.' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await db.execute(
      `UPDATE users SET password_hash = ?, otp_code = NULL, otp_used = FALSE WHERE id = ?`,
      [hash, rows[0].id]
    );
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [rows[0].id, rows[0].full_name, 'RESET_PASSWORD', 'Auth', 'Password reset via OTP email', request.ip]
    );
    return reply.send({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}