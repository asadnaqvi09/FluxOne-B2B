// Dynamic scoring factors — final score is always normalized to 100%.
// Final % = (Σ actual points / Σ maximum points) × 100

export const SCALE_MAX_POINTS_MSG =
  'Maximum points must be a whole number greater than 0.'

export function sumScalePoints(scales = [], excludeId = null) {
  return scales.reduce((sum, scale) => {
    if (excludeId && scale?.id === excludeId) return sum
    return sum + (Number(scale?.maxPoints) || 0)
  }, 0)
}

// Individual criterion: whole numbers only, min 1, no fixed upper cap.
export function parseScaleMaxPoints(rawValue) {
  if (rawValue === '' || rawValue == null) {
    return { ok: false, value: null, error: SCALE_MAX_POINTS_MSG }
  }
  const asNumber = Number(rawValue)
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber < 1) {
    return { ok: false, value: null, error: SCALE_MAX_POINTS_MSG }
  }
  return { ok: true, value: asNumber, error: null }
}

// Missing actual scores count as 0 for that factor.
export function sumActualPoints(scoresByScaleId = {}, scales = []) {
  return scales.reduce((sum, scale) => {
    const raw = scoresByScaleId?.[scale.id]
    const points = Number(raw)
    if (!Number.isFinite(points) || points < 0) return sum
    return sum + points
  }, 0)
}

// Weighted aggregate out of 100 — defaults to 0 when no factors exist.
export function calcWeightedScorePercent(scoresByScaleId = {}, scales = []) {
  const maxTotal = sumScalePoints(scales)
  if (maxTotal <= 0) return 0
  const actualTotal = sumActualPoints(scoresByScaleId, scales)
  return Math.round((actualTotal / maxTotal) * 10000) / 100
}

export function formatScorePercent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}
