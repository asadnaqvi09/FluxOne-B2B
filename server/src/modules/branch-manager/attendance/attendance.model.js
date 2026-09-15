import { tenantQuery } from '../../../config/db.js'

export async function upsertAttendance(tenantId, payload) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      INSERT INTO attendance (tenant_id, staff_id, work_date, status, note, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_id, staff_id, work_date)
      DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note
      RETURNING id, to_char(work_date, 'YYYY-MM-DD') AS "workDate", status
    `,
    [payload.staffId, payload.workDate, payload.status, payload.note || null, payload.createdBy],
  )
  return rows[0]
}

export async function listAttendance(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT a.id, to_char(a.work_date, 'YYYY-MM-DD') AS "workDate", a.status, a.note, s.id AS "staffId"
      FROM attendance a
      JOIN staff s ON s.id = a.staff_id AND s.tenant_id = a.tenant_id
      WHERE a.tenant_id = $1
      ORDER BY a.work_date DESC
    `,
  )
  return rows
}

/** Clear holiday/leave attendance marks for a staff over dates (only matching status). */
export async function clearAttendanceMarks(tenantId, { staffId, dates, status, note = null }) {
  if (!staffId || !Array.isArray(dates) || dates.length === 0 || !status) return { rowCount: 0 }

  const { rowCount } = await tenantQuery(
    tenantId,
    `
      DELETE FROM attendance
      WHERE tenant_id = $1
        AND staff_id = $2
        AND status = $3
        AND work_date = ANY($4::date[])
        AND ($5::text IS NULL OR note = $5)
    `,
    [staffId, status, dates, note],
  )
  return { rowCount: rowCount || 0 }
}

/** Clear all holiday marks for a given date + holiday name (any staff). */
export async function clearHolidayAttendanceByDate(tenantId, { workDate, note }) {
  const { rowCount } = await tenantQuery(
    tenantId,
    `
      DELETE FROM attendance
      WHERE tenant_id = $1
        AND work_date = $2::date
        AND status = 'holiday'
        AND ($3::text IS NULL OR note = $3)
    `,
    [workDate, note || null],
  )
  return { rowCount: rowCount || 0 }
}
