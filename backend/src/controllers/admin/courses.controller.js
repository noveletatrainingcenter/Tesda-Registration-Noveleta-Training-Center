// backend/src/controllers/admin/courses.controller.js
import db from '../../config/db.js';

export async function getCourses(request, reply) {
  try {
    const [rows] = await db.execute(`SELECT * FROM courses WHERE is_active = TRUE ORDER BY name`);
    return reply.send({ success: true, data: rows });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function createCourse(request, reply) {
  const { name, code, sector } = request.body;
  if (!name) return reply.code(400).send({ success: false, message: 'Course name is required.' });
  try {
    const [result] = await db.execute(
      `INSERT INTO courses (name, code, sector) VALUES (?, ?, ?)`,
      [name, code || null, sector || null]
    );
    return reply.code(201).send({ success: true, id: result.insertId, message: 'Course created.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}