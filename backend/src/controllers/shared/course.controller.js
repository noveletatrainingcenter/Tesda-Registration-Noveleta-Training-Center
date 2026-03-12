// backend/src/controllers/shared/course.controller.js
import db from '../../config/db.js';
import { sanitize } from '../../utils/helpers.js';

export async function getCourses(request, reply) {
  const { page = 1, limit = 15, search = '', sector = '', status = 'active' } = request.query;
  const offset = (page - 1) * limit;

  try {
    let where = 'WHERE c.status = ?';
    const params = [status];

    if (search) {
      where += ` AND c.name LIKE ?`;
      params.push(`%${search}%`);
    }
    if (sector) {
      where += ' AND c.sector = ?';
      params.push(sector);
    }

    const [rows] = await db.execute(
      `SELECT c.*, u.full_name AS created_by_name
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       ${where} ORDER BY c.name ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM courses c ${where}`,
      params
    );

    return reply.send({
      success: true,
      data: rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function getCourse(request, reply) {
  const { id } = request.params;
  try {
    const [rows] = await db.execute('SELECT * FROM courses WHERE id = ?', [id]);
    if (!rows.length) return reply.code(404).send({ success: false, message: 'Course not found.' });
    return reply.send({ success: true, data: rows[0] });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function createCourse(request, reply) {
  const body = request.body;
  const createdBy = request.user.id;

  try {
    const [result] = await db.execute(
      `INSERT INTO courses (name, sector, description, is_active, created_by)
       VALUES (?,?,?,?,?)`,
      [
        sanitize(body.name),
        sanitize(body.sector),
        sanitize(body.description) || null,
        body.is_active !== false ? 1 : 0,
        createdBy,
      ]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [createdBy, request.user.full_name, 'CREATE_COURSE', 'Courses', `Created: ${body.name}`, request.ip]
    );

    return reply.code(201).send({
      success: true,
      id: result.insertId,
      message: 'Course created successfully.',
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function updateCourse(request, reply) {
  const { id } = request.params;
  const body = request.body;

  try {
    await db.execute(
      `UPDATE courses SET name=?, sector=?, description=?, is_active=? WHERE id=?`,
      [
        sanitize(body.name),
        sanitize(body.sector),
        sanitize(body.description) || null,
        body.is_active !== false ? 1 : 0,
        id,
      ]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'UPDATE_COURSE', 'Courses', `Updated ID: ${id}`, request.ip]
    );

    return reply.send({ success: true, message: 'Course updated successfully.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function toggleCourseStatus(request, reply) {
  const { id } = request.params;
  const { is_active } = request.body;

  try {
    await db.execute('UPDATE courses SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'TOGGLE_COURSE', 'Courses', `Toggled ID: ${id} → ${is_active ? 'active' : 'inactive'}`, request.ip]
    );
    return reply.send({ success: true, message: 'Course status updated.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function archiveCourse(request, reply) {
  const { id } = request.params;
  try {
    await db.execute('UPDATE courses SET status = "archived" WHERE id = ?', [id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'ARCHIVE_COURSE', 'Courses', `Archived ID: ${id}`, request.ip]
    );
    return reply.send({ success: true, message: 'Course archived.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}