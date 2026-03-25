// backend/src/controllers/shared/report.controller.js
import db from '../../config/db.js';
import { sanitize } from '../../utils/helpers.js';

function nullableDate(v) {
  if (!v || v === '') return null;
  if (v.includes('T')) return v.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const [m, d, y] = v.split('-');
  if (!m || !d || !y) return null;
  const full = y.length === 2 ? `20${y}` : y;
  return `${full}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

export async function getReports(request, reply) {
  const { page = 1, limit = 15, search = '', archived, date_from, date_to, min_trainees, max_trainees } = request.query;
  const offset = (page - 1) * limit;
  try {
    const statusVal = archived === 'true' || archived === true ? 'archived' : 'active';
    let where = `WHERE r.status = '${statusVal}'`;
    const params = [];
    if (search) { where += ` AND (r.title LIKE ? OR r.program_title LIKE ? OR r.delivery_mode LIKE ?)`; const s = `%${search}%`; params.push(s, s, s); }
    if (date_from) { where += ` AND DATE(r.created_at) >= ?`; params.push(date_from); }
    if (date_to) { where += ` AND DATE(r.created_at) <= ?`; params.push(date_to); }
    if (min_trainees) { where += ` AND (SELECT COUNT(*) FROM report_trainees rt WHERE rt.report_id = r.id) >= ?`; params.push(parseInt(min_trainees)); }
    if (max_trainees) { where += ` AND (SELECT COUNT(*) FROM report_trainees rt WHERE rt.report_id = r.id) <= ?`; params.push(parseInt(max_trainees)); }
    const [rows] = await db.execute(
      `SELECT r.*, u.full_name AS creator_name,
        (SELECT COUNT(*) FROM report_trainees rt WHERE rt.report_id = r.id) AS trainee_count,
        (SELECT COUNT(*) FROM report_trainees rt WHERE rt.report_id = r.id AND rt.date_finished IS NOT NULL AND rt.date_finished <= CURDATE()) AS finished_count
      FROM reports r LEFT JOIN users u ON r.created_by = u.id
      ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM reports r ${where}`, params);
    return reply.send({ success: true, data: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function getReport(request, reply) {
  const { id } = request.params;
  try {
    // Use db.query (not db.execute) to avoid mysql2 pool.execute bug with certain param types
    const [rrows] = await db.query(
      `SELECT r.*, u.full_name AS creator_name
       FROM reports r LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = ?`,
      [id]
    );
    if (!rrows || !rrows.length) {
      return reply.code(404).send({ success: false, message: 'Report not found.' });
    }

    const [trainees] = await db.query(
      `SELECT
        rt.id, rt.report_id, rt.registration_id,
        rt.student_id_number, rt.pgs_training_component, rt.voucher_number,
        rt.client_type,
        DATE_FORMAT(rt.date_started, '%Y-%m-%d')  AS date_started,
        DATE_FORMAT(rt.date_finished, '%Y-%m-%d') AS date_finished,
        rt.reason_not_finishing, rt.assessment_results,
        DATE_FORMAT(rt.employment_date, '%Y-%m-%d') AS employment_date,
        rt.employer_name, rt.employer_address,
        rt.region, rt.province, rt.district, rt.municipality,
        rt.provider_name, rt.tbp_id, rt.address,
        rt.institution_type, rt.classification,
        rt.full_qualification, rt.qualification_clustered,
        rt.qualification_ntr, rt.copr_number,
        rt.industry_sector, rt.industry_sector_other, rt.delivery_mode,
        rt.created_at,
        reg.last_name, reg.first_name, reg.middle_name, reg.extension_name,
        reg.contact_no, reg.email,
        reg.address_street, reg.address_subdivision,
        reg.address_barangay, reg.address_city, reg.address_province, reg.address_region,
        reg.sex, reg.birth_month, reg.birth_day, reg.birth_year, reg.age,
        reg.civil_status, reg.educational_attainment,
        reg.employment_status, reg.course_qualification
      FROM report_trainees rt
      LEFT JOIN registration reg ON rt.registration_id = reg.id
      WHERE rt.report_id = ?
      ORDER BY rt.id ASC`,
      [id]
    );

    return reply.send({ success: true, data: { ...rrows[0], trainees: trainees || [] } });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function createReport(request, reply) {
  const body = request.body;
  const createdBy = request.user.id;
  try {
    const [res] = await db.execute(
      `INSERT INTO reports (title, program_title, region, province, district, municipality, provider_name, tbp_id, address, institution_type, classification, full_qualification, qualification_clustered, delivery_mode, qualification_ntr, copr_number, industry_sector, industry_sector_other, prepared_by_left, prepared_by_right, nclc_admin, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [sanitize(body.title), sanitize(body.program_title), sanitize(body.region), sanitize(body.province), sanitize(body.district), sanitize(body.municipality), sanitize(body.provider_name), sanitize(body.tbp_id), sanitize(body.address), body.institution_type, sanitize(body.classification), sanitize(body.full_qualification), sanitize(body.qualification_clustered), sanitize(body.delivery_mode), sanitize(body.qualification_ntr), sanitize(body.copr_number), sanitize(body.industry_sector), sanitize(body.industry_sector_other), sanitize(body.prepared_by_left), sanitize(body.prepared_by_right), sanitize(body.nclc_admin), createdBy]
    );
    const reportId = res.insertId;
    if (Array.isArray(body.trainees)) {
      for (const t of body.trainees) {
        await db.execute(
          `INSERT INTO report_trainees (report_id, registration_id, student_id_number, pgs_training_component, voucher_number, client_type, date_started, date_finished, reason_not_finishing, assessment_results, employment_date, employer_name, employer_address, region, province, district, municipality, provider_name, tbp_id, address, institution_type, classification, full_qualification, qualification_clustered, qualification_ntr, copr_number, industry_sector, industry_sector_other, delivery_mode) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [reportId, t.registration_id, sanitize(t.student_id_number), sanitize(t.pgs_training_component), sanitize(t.voucher_number), sanitize(t.client_type), nullableDate(t.date_started), nullableDate(t.date_finished), sanitize(t.reason_not_finishing), sanitize(t.assessment_results), nullableDate(t.employment_date), sanitize(t.employer_name), sanitize(t.employer_address), sanitize(t.region), sanitize(t.province), sanitize(t.district), sanitize(t.municipality), sanitize(t.provider_name), sanitize(t.tbp_id), sanitize(t.address), sanitize(t.institution_type), sanitize(t.classification), sanitize(t.full_qualification), sanitize(t.qualification_clustered), sanitize(t.qualification_ntr), sanitize(t.copr_number), sanitize(t.industry_sector), sanitize(t.industry_sector_other), sanitize(t.delivery_mode)]
        );
      }
    }
    await db.execute('INSERT INTO audit_logs (user_id,user_name,action,module,details,ip_address) VALUES (?,?,?,?,?,?)', [createdBy, request.user.full_name, 'CREATE_REPORT', 'Reports', `Created: ${body.title || 'Untitled'} (ID:${reportId})`, request.ip]);
    return reply.code(201).send({ success: true, id: reportId, message: 'Report saved.' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error: ' + err.message });
  }
}

export async function updateReport(request, reply) {
  const { id } = request.params;
  const body = request.body;
  try {
    await db.execute(
      `UPDATE reports SET title=?, program_title=?, region=?, province=?, district=?, municipality=?, provider_name=?, tbp_id=?, address=?, institution_type=?, classification=?, full_qualification=?, qualification_clustered=?, delivery_mode=?, qualification_ntr=?, copr_number=?, industry_sector=?, industry_sector_other=?, prepared_by_left=?, prepared_by_right=?, nclc_admin=? WHERE id=?`,
      [sanitize(body.title), sanitize(body.program_title), sanitize(body.region), sanitize(body.province), sanitize(body.district), sanitize(body.municipality), sanitize(body.provider_name), sanitize(body.tbp_id), sanitize(body.address), body.institution_type, sanitize(body.classification), sanitize(body.full_qualification), sanitize(body.qualification_clustered), sanitize(body.delivery_mode), sanitize(body.qualification_ntr), sanitize(body.copr_number), sanitize(body.industry_sector), sanitize(body.industry_sector_other), sanitize(body.prepared_by_left), sanitize(body.prepared_by_right), sanitize(body.nclc_admin), id]
    );
    await db.execute('DELETE FROM report_trainees WHERE report_id = ?', [id]);
    if (Array.isArray(body.trainees)) {
      for (const t of body.trainees) {
        await db.execute(
          `INSERT INTO report_trainees (report_id, registration_id, student_id_number, pgs_training_component, voucher_number, client_type, date_started, date_finished, reason_not_finishing, assessment_results, employment_date, employer_name, employer_address, region, province, district, municipality, provider_name, tbp_id, address, institution_type, classification, full_qualification, qualification_clustered, qualification_ntr, copr_number, industry_sector, industry_sector_other, delivery_mode) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, t.registration_id, sanitize(t.student_id_number), sanitize(t.pgs_training_component), sanitize(t.voucher_number), sanitize(t.client_type), nullableDate(t.date_started), nullableDate(t.date_finished), sanitize(t.reason_not_finishing), sanitize(t.assessment_results), nullableDate(t.employment_date), sanitize(t.employer_name), sanitize(t.employer_address), sanitize(t.region), sanitize(t.province), sanitize(t.district), sanitize(t.municipality), sanitize(t.provider_name), sanitize(t.tbp_id), sanitize(t.address), sanitize(t.institution_type), sanitize(t.classification), sanitize(t.full_qualification), sanitize(t.qualification_clustered), sanitize(t.qualification_ntr), sanitize(t.copr_number), sanitize(t.industry_sector), sanitize(t.industry_sector_other), sanitize(t.delivery_mode)]
        );
      }
    }
    await db.execute('INSERT INTO audit_logs (user_id,user_name,action,module,details,ip_address) VALUES (?,?,?,?,?,?)', [request.user.id, request.user.full_name, 'UPDATE_REPORT', 'Reports', `Updated ID:${id}`, request.ip]);
    return reply.send({ success: true, message: 'Report updated.' });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function archiveReport(request, reply) {
  const { id } = request.params;
  try {
    await db.execute(`UPDATE reports SET status = 'archived' WHERE id = ?`, [id]);
    await db.execute('INSERT INTO audit_logs (user_id,user_name,action,module,details,ip_address) VALUES (?,?,?,?,?,?)', [request.user.id, request.user.full_name, 'ARCHIVE_REPORT', 'Reports', `Archived ID:${id}`, request.ip]);
    return reply.send({ success: true, message: 'Report archived.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function restoreReport(request, reply) {
  const { id } = request.params;
  try {
    await db.execute(`UPDATE reports SET status = 'active' WHERE id = ?`, [id]);
    await db.execute('INSERT INTO audit_logs (user_id,user_name,action,module,details,ip_address) VALUES (?,?,?,?,?,?)', [request.user.id, request.user.full_name, 'RESTORE_REPORT', 'Reports', `Restored ID:${id}`, request.ip]);
    return reply.send({ success: true, message: 'Report restored.' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}

export async function getEnrolledIds(request, reply) {
  const { course_name } = request.query;
  if (!course_name) return reply.send({ success: true, data: [] });

  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT rt.registration_id
       FROM report_trainees rt
       JOIN reports r ON rt.report_id = r.id
       WHERE r.status = 'active'
         AND rt.delivery_mode = ?`,
      [course_name]
    );
    return reply.send({ success: true, data: rows.map(r => r.registration_id) });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ success: false, message: 'Server error.' });
  }
}