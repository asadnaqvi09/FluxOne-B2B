import { tenantQuery } from '../../../config/db.js'

export async function createLeave(tenantId, { staffId, startDate, endDate, reason, status }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      INSERT INTO leaves (tenant_id, staff_id, start_date, end_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, staff_id AS "staffId", start_date AS "startDate", end_date AS "endDate", reason, status
    `,
    [staffId, startDate, endDate, reason || null, status || 'approved'],
  )
  return rows[0]
}

export async function listLeaves(tenantId, { designationId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        l.id,
        l.start_date AS "startDate",
        l.end_date AS "endDate",
        l.reason,
        l.status,
        s.id AS "staffId",
        u.full_name AS "fullName",
        s.designation_id AS "designationId",
        d.name AS "designation"
      FROM leaves l
      JOIN staff s ON s.id = l.staff_id AND s.tenant_id = l.tenant_id
      JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
      LEFT JOIN designations d ON d.id = s.designation_id AND d.tenant_id = s.tenant_id
      WHERE l.tenant_id = $1
        AND ($2::uuid IS NULL OR s.designation_id = $2)
      ORDER BY l.created_at DESC
    `,
    [designationId || null],
  )
  return rows
}

export async function getLeaveById(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        l.id,
        l.start_date AS "startDate",
        l.end_date AS "endDate",
        l.reason,
        l.status,
        s.id AS "staffId",
        u.full_name AS "fullName",
        s.designation_id AS "designationId",
        d.name AS "designation"
      FROM leaves l
      JOIN staff s ON s.id = l.staff_id AND s.tenant_id = l.tenant_id
      JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
      LEFT JOIN designations d ON d.id = s.designation_id AND d.tenant_id = s.tenant_id
      WHERE l.tenant_id = $1 AND l.id = $2
      LIMIT 1
    `,
    [id],
  )
  return rows[0] || null
}

export async function updateLeave(tenantId, id, { startDate, endDate, reason, status }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE leaves
      SET
        start_date = COALESCE($2::date, start_date),
        end_date = COALESCE($3::date, end_date),
        reason = COALESCE($4, reason),
        status = COALESCE($5, status)
      WHERE tenant_id = $1 AND id = $6
      RETURNING id, staff_id AS "staffId", start_date AS "startDate", end_date AS "endDate", reason, status
    `,
    [startDate || null, endDate || null, reason ?? null, status || null, id],
  )
  return rows[0] || null
}

export async function deleteLeave(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      DELETE FROM leaves
      WHERE tenant_id = $1 AND id = $2
      RETURNING id, staff_id AS "staffId", start_date AS "startDate", end_date AS "endDate", reason, status
    `,
    [id],
  )
  return rows[0] || null
}
