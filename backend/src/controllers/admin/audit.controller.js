// backend/src/controllers/admin/audit.controller.js
import db from '../../config/db.js';

export async function getAuditLogs(request, reply) {
  const { limit = 15, page = 1, search, action, date_from, date_to } = request.query;
  const pageNum   = parseInt(page);
  const limitNum  = parseInt(limit);
  const offset    = (pageNum - 1) * limitNum;

  try {
    // Build WHERE clauses dynamically
    const conditions = [];
    const params     = [];

    if (search) {
      conditions.push('(user_name LIKE ? OR details LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (action) {
      conditions.push('LOWER(action) LIKE ?');
      params.push(`%${action.toLowerCase()}%`);
    }
    if (date_from) {
      conditions.push('DATE(created_at) >= ?');
      params.push(date_from);
    }
    if (date_to) {
      conditions.push('DATE(created_at) <= ?');
      params.push(date_to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${where}`,
      params
    );

    // Get paginated rows
    const [rows] = await db.execute(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}