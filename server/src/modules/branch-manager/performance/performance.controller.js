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

const SCALE_MAX_POINTS_MSG = 'Maximum points must be a whole number greater than 0.'

// Final % = (Σ actual / Σ max) × 100 — missing actual treated as 0 via numerator.
const WEIGHTED_RATING_SQL = `
  COALESCE(
    ROUND(
      (
        COALESCE((
          SELECT SUM(lp.points)::numeric
          FROM (
            SELECT DISTINCT ON (ps.scale_id) ps.points
            FROM performance_scores ps
            INNER JOIN scoring_scales ss_live
              ON ss_live.id = ps.scale_id AND ss_live.tenant_id = ps.tenant_id
            WHERE ps.staff_id = s.id AND ps.tenant_id = s.tenant_id
            ORDER BY ps.scale_id, ps.scored_on DESC, ps.id DESC
          ) lp
        ), 0)
        /
        NULLIF((
          SELECT SUM(ss_all.max_points)::numeric
          FROM scoring_scales ss_all
          WHERE ss_all.tenant_id = s.tenant_id
        ), 0)
      ) * 100
    , 2)
  , 0)
`

function parseMaxPoints(raw) {
  const points = Number(raw)
  if (!Number.isFinite(points) || !Number.isInteger(points) || points < 1) {
    return { ok: false, error: SCALE_MAX_POINTS_MSG }
  }
  return { ok: true, value: points }
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
    // Drop related scores so deleted factors leave the weighted calc
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

  const numericPoints = Number(points)
  if (!Number.isFinite(numericPoints) || numericPoints < 0) {
    return fail(res, 'Points must be a non-negative number', 400)
  }

  try {
    const { rows: scaleRows } = await tenantQuery(
      req.tenantId,
      `SELECT max_points AS "maxPoints" FROM scoring_scales WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [scaleId],
    )
    if (scaleRows.length === 0) {
      return fail(res, 'Scoring scale not found', 404)
    }

    const maxPoints = Number(scaleRows[0].maxPoints)
    if (numericPoints > maxPoints) {
      return fail(res, `Points cannot exceed the factor maximum of ${maxPoints}`, 400)
    }

    // Keep one score row per staff + factor (replace prior value)
    await tenantQuery(
      req.tenantId,
      `DELETE FROM performance_scores WHERE tenant_id = $1 AND staff_id = $2 AND scale_id = $3`,
      [staffId, scaleId],
    )

    const { rows } = await tenantQuery(
      req.tenantId,
      `
        INSERT INTO performance_scores (tenant_id, staff_id, scale_id, points, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, points
      `,
      [staffId, scaleId, numericPoints, req.user.id],
    )
    return success(res, rows[0], 201)
  } catch (err) {
    return fail(res, err.message || 'Failed to score staff', 500)
  }
}

// Aggregated scores for all staff — weighted % out of 100
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
          ${WEIGHTED_RATING_SQL} AS "rating"
        FROM staff s
        LEFT JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        LEFT JOIN designations d ON d.id = s.designation_id
        WHERE s.tenant_id = $1 AND s.status = 'active'
        ORDER BY u.full_name ASC
      `,
    )
    return success(res, rows)
  } catch (err) {
    return fail(res, err.message || 'Failed to fetch performance scores', 500)
  }
}

export { WEIGHTED_RATING_SQL }
