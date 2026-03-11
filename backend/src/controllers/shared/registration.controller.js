// backend/src/controllers/shared/registration.controller.js
import db from '../../config/db.js';
import { generateULIPlaceholder, calculateAge, sanitize } from '../../utils/helpers.js';

export async function getRegistrations(request, reply) {
  const { page = 1, limit = 15, search = '', course = '', status = 'active' } = request.query;
  const offset = (page - 1) * limit;

  try {
    let where = 'WHERE r.status = ?';
    const params = [status];

    if (search) {
      where += ` AND (r.last_name LIKE ? OR r.first_name LIKE ? OR r.uli_number LIKE ? OR r.contact_no LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (course) {
      where += ' AND r.course_qualification = ?';
      params.push(course);
    }

    const [rows] = await db.execute(
      `SELECT r.*, u.full_name as encoder_name
       FROM registration r LEFT JOIN users u ON r.encoded_by = u.id
       ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM registration r ${where}`,
      params
    );

    return reply.send({ success: true, data: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function getRegistration(request, reply) {
  const { id } = request.params;
  try {
    const [rows] = await db.execute(
      `SELECT r.*, u.full_name as encoder_name FROM registration r
       LEFT JOIN users u ON r.encoded_by = u.id WHERE r.id = ?`,
      [id]
    );
    if (!rows.length) return reply.code(404).send({ success: false, message: 'Registration not found.' });
    return reply.send({ success: true, data: rows[0] });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function createRegistration(request, reply) {
  const body = request.body;
  const encodedBy = request.user.id;

  try {
    const age = calculateAge(body.birth_month, body.birth_day, body.birth_year);
    const uli = generateULIPlaceholder();

    const scholarshipFinal = body.scholarship_type === 'Others'
      ? sanitize(body.scholarship_other)
      : sanitize(body.scholarship_type);

    const [result] = await db.execute(
      `INSERT INTO registration (
        uli_number, entry_date,
        last_name, first_name, middle_name, extension_name,
        address_subdivision, address_street, address_barangay,
        address_city, address_province, address_region,
        email, contact_no, nationality,
        sex, civil_status,
        employment_status, employment_type,
        birth_month, birth_day, birth_year, age,
        birthplace_city, birthplace_province, birthplace_region,
        educational_attainment, parent_guardian_name, parent_guardian_address,
        client_classification,
        has_disability, disability_type, disability_cause,
        course_qualification, scholarship_type,
        privacy_consent, encoded_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        uli, body.entry_date || new Date(),
        sanitize(body.last_name), sanitize(body.first_name),
        sanitize(body.middle_name), sanitize(body.extension_name),
        sanitize(body.address_subdivision), sanitize(body.address_street),
        sanitize(body.address_barangay), sanitize(body.address_city),
        sanitize(body.address_province), sanitize(body.address_region),
        sanitize(body.email), sanitize(body.contact_no),
        sanitize(body.nationality) || 'Filipino',
        body.sex, body.civil_status,
        body.employment_status, body.employment_type,
        body.birth_month, body.birth_day, body.birth_year, age,
        sanitize(body.birthplace_city), sanitize(body.birthplace_province), sanitize(body.birthplace_region),
        body.educational_attainment,
        sanitize(body.parent_guardian_name), sanitize(body.parent_guardian_address),
        body.client_classification,
        body.has_disability ? 1 : 0,
        body.has_disability ? body.disability_type  : null,
        body.has_disability ? body.disability_cause : null,
        sanitize(body.course_qualification), scholarshipFinal,
        body.privacy_consent ? 1 : 0, encodedBy,
      ]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [encodedBy, request.user.full_name, 'CREATE_REGISTRATION', 'Registration', `Created: ${body.last_name}, ${body.first_name}`, request.ip]
    );

    return reply.code(201).send({ success: true, id: result.insertId, uli_number: uli, message: 'Registration created successfully.' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function updateRegistration(request, reply) {
  const { id } = request.params;
  const body = request.body;

  try {
    const age = calculateAge(body.birth_month, body.birth_day, body.birth_year);

    const scholarshipFinal = body.scholarship_type === 'Others'
      ? sanitize(body.scholarship_other)
      : sanitize(body.scholarship_type);

    await db.execute(
      `UPDATE registration SET
        last_name=?, first_name=?, middle_name=?, extension_name=?,
        address_subdivision=?, address_street=?, address_barangay=?,
        address_city=?, address_province=?, address_region=?,
        email=?, contact_no=?, nationality=?,
        sex=?, civil_status=?,
        employment_status=?, employment_type=?,
        birth_month=?, birth_day=?, birth_year=?, age=?,
        birthplace_city=?, birthplace_province=?, birthplace_region=?,
        educational_attainment=?, parent_guardian_name=?, parent_guardian_address=?,
        client_classification=?,
        has_disability=?, disability_type=?, disability_cause=?,
        course_qualification=?, scholarship_type=?,
        privacy_consent=?
       WHERE id=?`,
      [
        sanitize(body.last_name), sanitize(body.first_name),
        sanitize(body.middle_name), sanitize(body.extension_name),
        sanitize(body.address_subdivision), sanitize(body.address_street),
        sanitize(body.address_barangay), sanitize(body.address_city),
        sanitize(body.address_province), sanitize(body.address_region),
        sanitize(body.email), sanitize(body.contact_no),
        sanitize(body.nationality) || 'Filipino',
        body.sex, body.civil_status,
        body.employment_status, body.employment_type,
        body.birth_month, body.birth_day, body.birth_year, age,
        sanitize(body.birthplace_city), sanitize(body.birthplace_province), sanitize(body.birthplace_region),
        body.educational_attainment,
        sanitize(body.parent_guardian_name), sanitize(body.parent_guardian_address),
        body.client_classification,
        body.has_disability ? 1 : 0,
        body.has_disability ? body.disability_type  : null,
        body.has_disability ? body.disability_cause : null,
        sanitize(body.course_qualification), scholarshipFinal,
        body.privacy_consent ? 1 : 0,
        id,
      ]
    );

    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'UPDATE_REGISTRATION', 'Registration', `Updated ID: ${id}`, request.ip]
    );

    return reply.send({ success: true, message: 'Registration updated successfully.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function archiveRegistration(request, reply) {
  const { id } = request.params;
  try {
    await db.execute('UPDATE registration SET status = "archived" WHERE id = ?', [id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'ARCHIVE_REGISTRATION', 'Registration', `Archived ID: ${id}`, request.ip]
    );
    return reply.send({ success: true, message: 'Registration archived.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function getStats(request, reply) {
  try {
    const [[{ total }]]      = await db.execute(`SELECT COUNT(*) as total FROM registration WHERE status='active'`);
    const [[{ today }]]      = await db.execute(`SELECT COUNT(*) as today FROM registration WHERE DATE(created_at)=CURDATE() AND status='active'`);
    const [[{ this_month }]] = await db.execute(`SELECT COUNT(*) as this_month FROM registration WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW()) AND status='active'`);
    const [by_course]        = await db.execute(`SELECT course_qualification as course, COUNT(*) as count FROM registration WHERE status='active' GROUP BY course_qualification ORDER BY count DESC LIMIT 8`);
    const [monthly]          = await db.execute(`SELECT MONTH(created_at) as month, YEAR(created_at) as year, COUNT(*) as count FROM registration WHERE status='active' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY YEAR(created_at), MONTH(created_at) ORDER BY year, month`);

    return reply.send({ success: true, stats: { total, today, this_month, by_course, monthly } });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}