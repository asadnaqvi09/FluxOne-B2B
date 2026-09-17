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

// All scoring criteria for a tenant share a fixed 100-point budget.
const SCALE_POINTS_BUDGET = 100
const SCALE_SCORE_RANGE_MSG = 'Score must be between 0 and 100.'
const SCALE_TOTAL_LIMIT_MSG =
  'Total scoring points cannot exceed 100. Please reduce the score points before saving.'

function parseMaxPoints(raw) {
  const points = Number(raw)
  if (!Number.isFinite(points) || !Number.isInteger(points) || points < 0 || points > 100) {
    return { ok: false, error: SCALE_SCORE_RANGE_MSG }
  }
  return { ok: true, value: points }
}

async function getAllocatedPoints(tenantId, excludeId = null) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT COALESCE(SUM(max_points), 0)::int AS total
      FROM scoring_scales
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR id <> $2::uuid)
    `,
    [excludeId],
  )
  return Number(rows[0]?.total) || 0
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
  if (!name || maxPoints === undefined || maxPoints === null || maxPoints === '') {
    return fail(res, 'Scale name and max points are required', 400)
  }

  const parsed = parseMaxPoints(maxPoints)
  if (!parsed.ok) return fail(res, parsed.error, 400)
  const points = parsed.value

  const code = slugify(name)

  // If code already exists, upsert updates that row — exclude it from the budget sum
  const { rows: existingRows } = await tenantQuery(
    req.tenantId,
    `SELECT id FROM scoring_scales WHERE tenant_id = $1 AND code = $2 LIMIT 1`,
    [code],
  )
  const excludeId = existingRows[0]?.id || null

  const allocated = await getAllocatedPoints(req.tenantId, excludeId)
  if (allocated + points > SCALE_POINTS_BUDGET) {
    return fail(res, SCALE_TOTAL_LIMIT_MSG, 400)
  }

  try {
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        INSERT INTO scoring_scales (tenant_id, code, name, max_points)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, max_points = EXCLUDED.max_points
        RETURNING id, code, name, max_points AS "maxPoints"
      `,
      [code, name.trim(), points],
    )
    return success(res, rows[0], 201)
  } catch (err) {
    return fail(res, err.message || 'Failed to create scale', 500)
  }
}

export async function updateScale(req, res) {
  const { id } = req.params
  const { name, maxPoints } = req.body

  if (!name || maxPoints === undefined || maxPoints === null || maxPoints === '') {
    return fail(res, 'Scale name and max points are required', 400)
  }

  const parsed = parseMaxPoints(maxPoints)
  if (!parsed.ok) return fail(res, parsed.error, 400)
  const points = parsed.value

  // Exclude current scale so its points can be redistributed within the 100 budget
  const allocated = await getAllocatedPoints(req.tenantId, id)
  if (allocated + points > SCALE_POINTS_BUDGET) {
    return fail(res, SCALE_TOTAL_LIMIT_MSG, 400)
  }

  const code = slugify(name)

  try {
    // tenantQuery prepends tenantId as $1 — do not pass it again in params
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        UPDATE scoring_scales
        SET name = $2, max_points = $3, code = $4
        WHERE tenant_id = $1 AND id = $5
        RETURNING id, code, name, max_points AS "maxPoints"
      `,
      [name.trim(), points, code, id],
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
