// backend/src/controllers/shared/registration.controller.js
import db from '../../config/db.js';
import { calculateAge, sanitize } from '../../utils/helpers.js';

export async function getRegistrations(request, reply) {
  const {
    page = 1, limit = 15, search = '', course = '',
    status = 'active',
    sex, employment_status, scholarship_type,
    date_from, date_to,
  } = request.query;
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
    if (sex) {
      where += ' AND r.sex = ?';
      params.push(sex);
    }
    if (employment_status) {
      where += ' AND r.employment_status = ?';
      params.push(employment_status);
    }
    if (scholarship_type) {
      where += ' AND r.scholarship_type = ?';
      params.push(scholarship_type);
    }
    if (date_from) {
      where += ' AND DATE(r.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      where += ' AND DATE(r.created_at) <= ?';
      params.push(date_to);
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

    const scholarshipFinal = body.scholarship_type === 'Others'
      ? sanitize(body.scholarship_other)
      : sanitize(body.scholarship_type);

    const [result] = await db.execute(
      `INSERT INTO registration (
        entry_date,
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
        body.entry_date || new Date(),
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

    return reply.code(201).send({ success: true, id: result.insertId, message: 'Registration created successfully.' });
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

export async function restoreRegistration(request, reply) {
  const { id } = request.params;
  try {
    await db.execute('UPDATE registration SET status = "active" WHERE id = ?', [id]);
    await db.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, module, details, ip_address) VALUES (?,?,?,?,?,?)',
      [request.user.id, request.user.full_name, 'RESTORE_REGISTRATION', 'Registration', `Restored ID: ${id}`, request.ip]
    );
    return reply.send({ success: true, message: 'Registration restored.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

// HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER // HOME CONTROLLER

export async function getTrainingStats(request, reply) {
  try {
    // Total active registrations
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM registration WHERE status='active'`
    );

    // We don't have training progress data in registration table
    // This would come from reports if needed
    return reply.send({
      completed: 0,
      ongoing: 0,
      dropped: 0,
      not_started: total,
      completion_rate: 0,
      message: "Training progress data available in Reports module"
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function getEmploymentStats(request, reply) {
  const { date_from, date_to } = request.query;
  
  try {
    let dateFilter = '';
    const params = [];

    if (date_from && date_to) {
      dateFilter = 'AND DATE(created_at) BETWEEN ? AND ?';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateFilter = 'AND DATE(created_at) >= ?';
      params.push(date_from);
    } else if (date_to) {
      dateFilter = 'AND DATE(created_at) <= ?';
      params.push(date_to);
    }

    const [rows] = await db.execute(
      `SELECT 
        employment_status,
        COUNT(*) as count
       FROM registration 
       WHERE status='active' 
       ${dateFilter}
       GROUP BY employment_status`,
      params
    );

    const stats = {
      employed: 0,
      unemployed: 0,
      self_employed: 0,
      underemployed: 0,
      total_employed: 0,
      employment_rate: 0
    };

    let total = 0;
    rows.forEach((row) => {
      const status = (row.employment_status || '').toLowerCase();
      if (status.includes('wage') || status === 'employed') {
        stats.employed += row.count;
      } else if (status.includes('under')) {
        stats.underemployed += row.count;
      } else if (status.includes('self')) {
        stats.self_employed += row.count;
      } else if (status.includes('unemployed')) {
        stats.unemployed += row.count;
      }
      total += row.count;
    });

    stats.total_employed = stats.employed + stats.self_employed;
    stats.employment_rate = total > 0 
      ? Math.round((stats.total_employed / total) * 100) 
      : 0;

    return reply.send(stats);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function getDemographics(request, reply) {
  try {
    // Age groups (age is calculated in registration)
    const [ageRows] = await db.execute(
      `SELECT 
        CASE 
          WHEN age BETWEEN 18 AND 24 THEN '18-24'
          WHEN age BETWEEN 25 AND 34 THEN '25-34'
          WHEN age BETWEEN 35 AND 44 THEN '35-44'
          WHEN age BETWEEN 45 AND 54 THEN '45-54'
          WHEN age >= 55 THEN '55+'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*) as count
       FROM registration 
       WHERE status='active' AND age IS NOT NULL
       GROUP BY age_group`
    );

    const by_age = {};
    ageRows.forEach((row) => {
      by_age[row.age_group] = row.count;
    });

    // Sex distribution
    const [sexRows] = await db.execute(
      `SELECT 
        sex,
        COUNT(*) as count
       FROM registration 
       WHERE status='active' 
       GROUP BY sex`
    );

    const by_sex = { male: 0, female: 0, other: 0 };
    sexRows.forEach((row) => {
      const sex = row.sex || '';
      if (sex === 'Male') by_sex.male = row.count;
      else if (sex === 'Female') by_sex.female = row.count;
      else by_sex.other += row.count;
    });

    // Civil status
    const [civilRows] = await db.execute(
      `SELECT 
        civil_status,
        COUNT(*) as count
       FROM registration 
       WHERE status='active' AND civil_status IS NOT NULL 
       GROUP BY civil_status`
    );

    const by_civil_status = {};
    civilRows.forEach((row) => {
      by_civil_status[row.civil_status] = row.count;
    });

    // Educational attainment
    const [eduRows] = await db.execute(
      `SELECT 
        educational_attainment,
        COUNT(*) as count
       FROM registration 
       WHERE status='active' AND educational_attainment IS NOT NULL 
       GROUP BY educational_attainment`
    );

    const by_education = {};
    eduRows.forEach((row) => {
      by_education[row.educational_attainment] = row.count;
    });

    // Client classifications
    const [classRows] = await db.execute(
      `SELECT 
        client_classification,
        COUNT(*) as count
       FROM registration 
       WHERE status='active' AND client_classification IS NOT NULL 
       GROUP BY client_classification`
    );

    const by_classification = {};
    classRows.forEach((row) => {
      by_classification[row.client_classification] = row.count;
    });

    // Disability stats
    const [[{ with_disability }]] = await db.execute(
      `SELECT COUNT(*) as with_disability 
       FROM registration 
       WHERE status='active' AND has_disability = 1`
    );

    const [[{ without_disability }]] = await db.execute(
      `SELECT COUNT(*) as without_disability 
       FROM registration 
       WHERE status='active' AND (has_disability = 0 OR has_disability IS NULL)`
    );

    return reply.send({
      by_age,
      by_sex,
      by_civil_status,
      by_education,
      by_classification,
      by_disability: {
        with_disability: with_disability || 0,
        without_disability: without_disability || 0
      }
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function getTimeline(request, reply) {
  const { date_from, date_to } = request.query;
  
  try {
    let dateFilter = '';
    const params = [];

    if (date_from && date_to) {
      dateFilter = 'AND DATE(created_at) BETWEEN ? AND ?';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateFilter = 'AND DATE(created_at) >= ?';
      params.push(date_from);
    } else if (date_to) {
      dateFilter = 'AND DATE(created_at) <= ?';
      params.push(date_to);
    }

    const query = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as registrations
      FROM registration 
      WHERE status='active' 
        ${dateFilter}
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY month ASC
    `;

    const [rows] = await db.execute(query, params);
    return reply.send(rows);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function getStats(request, reply) {
  const { date_from, date_to } = request.query;
  
  try {
    let dateFilter = '';
    const params = [];

    if (date_from && date_to) {
      dateFilter = 'AND DATE(created_at) BETWEEN ? AND ?';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateFilter = 'AND DATE(created_at) >= ?';
      params.push(date_from);
    } else if (date_to) {
      dateFilter = 'AND DATE(created_at) <= ?';
      params.push(date_to);
    }

    // Total with date filter
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM registration WHERE status='active' ${dateFilter}`,
      params
    );

    // Today (still shows today regardless of filter)
    const [[{ today }]] = await db.execute(
      `SELECT COUNT(*) as today FROM registration WHERE DATE(created_at)=CURDATE() AND status='active'`
    );

    // This month with date filter
    const [[{ this_month }]] = await db.execute(
      `SELECT COUNT(*) as this_month FROM registration 
       WHERE status='active' 
       AND MONTH(created_at)=MONTH(NOW()) 
       AND YEAR(created_at)=YEAR(NOW())
       ${dateFilter}`,
      params
    );
    
    // Get previous period for growth calculation
    let growth_rate = 0;
    if (!date_from && !date_to) {
      const [[{ last_month }]] = await db.execute(
        `SELECT COUNT(*) as last_month FROM registration 
         WHERE status='active' 
         AND MONTH(created_at)=MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
         AND YEAR(created_at)=YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))`
      );
      growth_rate = last_month > 0 ? Math.round(((total - last_month) / last_month) * 100) : 0;
    }
    
    // Course distribution with date filter
    const [by_course] = await db.execute(
      `SELECT 
        course_qualification as course, 
        COUNT(*) as count 
       FROM registration 
       WHERE status='active' 
         AND course_qualification IS NOT NULL 
         AND course_qualification != ''
         ${dateFilter}
       GROUP BY course_qualification 
       ORDER BY count DESC`,
      params
    );
    
    // Monthly data with date filter
    const [monthly] = await db.execute(
      `SELECT MONTH(created_at) as month, YEAR(created_at) as year, COUNT(*) as count 
       FROM registration 
       WHERE status='active' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         ${dateFilter}
       GROUP BY YEAR(created_at), MONTH(created_at) 
       ORDER BY year, month`,
      params
    );

    return reply.send({ 
      success: true, 
      stats: { 
        total, 
        today, 
        this_month, 
        by_course, 
        monthly,
        growth_rate 
      } 
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
}

export async function getCourseStats(request, reply) {
  try {
    const [by_course] = await db.execute(
      `SELECT 
        course_qualification as course, 
        COUNT(*) as count 
       FROM registration 
       WHERE status='active' 
         AND course_qualification IS NOT NULL 
         AND course_qualification != ''
       GROUP BY course_qualification 
       ORDER BY count DESC`
    );

    const [[{ total_courses }]] = await db.execute(
      `SELECT COUNT(DISTINCT course_qualification) as total_courses 
       FROM registration 
       WHERE status='active' 
         AND course_qualification IS NOT NULL 
         AND course_qualification != ''`
    );

    const [[{ total_registrations }]] = await db.execute(
      `SELECT COUNT(*) as total_registrations 
       FROM registration 
       WHERE status='active'`
    );

    return reply.send({
      success: true,
      data: {
        by_course,
        total_courses,
        total_registrations
      }
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
}