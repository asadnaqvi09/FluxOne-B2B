import { tenantQuery } from '../../../config/db.js'
import { success, fail } from '../../../utils/response.util.js'

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
}

export async function listScales(req, res) {
  const { rows } = await tenantQuery(
    req.tenantId,
    `SELECT id, code, name, max_points AS "maxPoints" FROM scoring_scales WHERE tenant_id = $1 ORDER BY name ASC`,
  )
  return success(res, rows)
}

export async function createScale(req, res) {
  const { name, maxPoints } = req.body
  if (!name || !maxPoints) {
    return fail(res, 'Scale name and max points are required', 400)
  }

  const code = slugify(name)

  try {
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        INSERT INTO scoring_scales (tenant_id, code, name, max_points)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, max_points = EXCLUDED.max_points
        RETURNING id, code, name, max_points AS "maxPoints"
      `,
      [code, name.trim(), parseInt(maxPoints, 10)],
    )
    return success(res, rows[0], 201)
  } catch (err) {
    return fail(res, err.message || 'Failed to create scale', 500)
  }
}

export async function updateScale(req, res) {
  const { id } = req.params
  const { name, maxPoints } = req.body

  if (!name || !maxPoints) {
    return fail(res, 'Scale name and max points are required', 400)
  }

  const code = slugify(name)

  try {
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        UPDATE scoring_scales
        SET name = $1, max_points = $2, code = $3
        WHERE tenant_id = $4 AND id = $5
        RETURNING id, code, name, max_points AS "maxPoints"
      `,
      [name.trim(), parseInt(maxPoints, 10), code, req.tenantId, id],
    )
    if (rows.length === 0) {
      return fail(res, 'Scale not found', 404)
    }
    return success(res, rows[0])
  } catch (err) {
    return fail(res, err.message || 'Failed to update scale', 500)
  }
}

export async function deleteScale(req, res) {
  const { id } = req.params
  try {
    await tenantQuery(
      req.tenantId,
      `DELETE FROM performance_scores WHERE tenant_id = $1 AND scale_id = $2`,
      [id],
    )
    const { rowCount } = await tenantQuery(
      req.tenantId,
      `DELETE FROM scoring_scales WHERE tenant_id = $1 AND id = $2`,
      [id],
    )
    if (rowCount === 0) {
      return fail(res, 'Scale not found', 404)
    }
    return success(res, { message: 'Scale deleted successfully' })
  } catch (err) {
    return fail(res, err.message || 'Failed to delete scale', 500)
  }
}

export async function scoreStaff(req, res) {
  const { staffId, scaleId, points } = req.body
  if (!staffId || !scaleId || points === undefined) {
    return fail(res, 'Staff ID, scale ID, and points are required', 400)
  }

  try {
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        INSERT INTO performance_scores (tenant_id, staff_id, scale_id, points, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, points
      `,
      [staffId, scaleId, parseFloat(points), req.user.id],
    )
    return success(res, rows[0], 201)
  } catch (err) {
    return fail(res, err.message || 'Failed to score staff', 500)
  }
}

// Aggregated scores for all staff
export async function getStaffScores(req, res) {
  try {
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        SELECT 
          s.id AS "staffId",
          u.full_name AS "fullName",
          s.image_url AS "imageUrl",
          s.designation_id AS "designationId",
          d.name AS "designation",
          COALESCE(ROUND(AVG((ps.points / ss.max_points) * 100), 2), 0) AS "rating"
        FROM staff s
        LEFT JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        LEFT JOIN designations d ON d.id = s.designation_id
        LEFT JOIN performance_scores ps ON ps.staff_id = s.id AND ps.tenant_id = s.tenant_id
        LEFT JOIN scoring_scales ss ON ss.id = ps.scale_id AND ss.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1 AND s.status = 'active'
        GROUP BY s.id, u.full_name, s.image_url, s.designation_id, d.name
        ORDER BY u.full_name ASC
      `,
    )
    return success(res, rows)
  } catch (err) {
    return fail(res, err.message || 'Failed to fetch performance scores', 500)
  }
}
