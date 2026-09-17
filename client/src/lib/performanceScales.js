// Scoring scales share a fixed 100-point budget across all criteria.
export const SCALE_POINTS_BUDGET = 100

export const SCALE_SCORE_RANGE_MSG = 'Score must be between 0 and 100.'
export const SCALE_TOTAL_LIMIT_MSG =
  'Total scoring points cannot exceed 100. Please reduce the score points before saving.'

export function sumScalePoints(scales = [], excludeId = null) {
  return scales.reduce((sum, scale) => {
    if (excludeId && scale?.id === excludeId) return sum
    return sum + (Number(scale?.maxPoints) || 0)
  }, 0)
}

export function remainingScalePoints(scales = [], excludeId = null) {
  return Math.max(0, SCALE_POINTS_BUDGET - sumScalePoints(scales, excludeId))
}

// Individual criterion: whole numbers only, inclusive 0–100.
export function parseScaleMaxPoints(rawValue) {
  if (rawValue === '' || rawValue == null) return { ok: false, value: null, error: SCALE_SCORE_RANGE_MSG }
  const asNumber = Number(rawValue)
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber < 0 || asNumber > 100) {
    return { ok: false, value: null, error: SCALE_SCORE_RANGE_MSG }
  }
  return { ok: true, value: asNumber, error: null }
}

// Combined budget check after excluding the row being edited (if any).
export function validateScaleTotal(scales, points, excludeId = null) {
  const used = sumScalePoints(scales, excludeId)
  const projected = used + points
  if (projected > SCALE_POINTS_BUDGET) {
    return { ok: false, used, projected, error: SCALE_TOTAL_LIMIT_MSG }
  }
  return { ok: true, used, projected, error: null }
}
