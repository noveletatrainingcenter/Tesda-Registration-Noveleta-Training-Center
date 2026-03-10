// backend/src/controllers/admin/audit.controller.js
import db from '../../config/db.js';

export async function getAuditLogs(request, reply) {
  const { limit = 50, page = 1 } = request.query;
  const offset = (page - 1) * limit;
  try {
    const [rows] = await db.execute(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    return reply.send({ success: true, data: rows });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}