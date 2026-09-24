// Whole-number helpers — no decimal / fractional stock, prices, or qty inputs.

// Keep only optional leading minus + digits while typing (strip decimals).
export function sanitizeWholeNumberInput(raw, { allowNegative = false } = {}) {
  let text = String(raw ?? '')
  if (allowNegative) {
    const neg = text.trimStart().startsWith('-')
    text = text.replace(/[^\d]/g, '')
    return neg ? `-${text}` : text
  }
  return text.replace(/[^\d]/g, '')
}

// Clamp to integer bounds on blur / submit.
export function normalizeWholeNumber(
  raw,
  { min = 0, max = null, allowNegative = false, emptyAs = null } = {},
) {
  const text = String(raw ?? '').trim()
  if (text === '' || text === '-') {
    return emptyAs === null ? min : emptyAs
  }
  let n = Math.trunc(Number(text))
  if (!Number.isFinite(n)) {
    return emptyAs === null ? min : emptyAs
  }
  if (!allowNegative && n < min) n = min
  if (max != null && Number.isFinite(Number(max)) && n > Number(max)) n = Number(max)
  return n
}

export function toWholeNumber(value, fallback = 0) {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) ? n : fallback
}
