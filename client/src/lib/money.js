// Money helpers — align with DB NUMERIC(12,2) (purchase / selling prices).

// Round to 2 decimal places (safe for API submit).
export function roundMoney(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.round(n * 100) / 100
}

// Form display: 80.00 → "80", 2.87 → "2.87" (no noisy trailing zeros).
export function formatMoneyInput(value) {
  if (value === 0 || value === '0') return '0'
  if (value === '' || value == null) return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  // Strip trailing zeros after round to cents
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

// Typing sanitize: digits + optional one "." + up to 2 fraction digits.
export function sanitizeMoneyInput(raw, { allowNegative = false } = {}) {
  let text = String(raw ?? '')
  const neg = allowNegative && text.trimStart().startsWith('-')
  text = text.replace(/[^\d.]/g, '')
  const firstDot = text.indexOf('.')
  if (firstDot !== -1) {
    const intPart = text.slice(0, firstDot).replace(/\./g, '') || ''
    const fracPart = text.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
    text = `${intPart}.${fracPart}`
  }
  return neg ? `-${text}` : text
}

// Blur / commit normalize to a clean money string (or empty).
export function normalizeMoneyInput(
  raw,
  { min = 0, max = null, allowEmpty = true, emptyAs = '' } = {},
) {
  const text = String(raw ?? '').trim()
  if (text === '' || text === '-' || text === '.') {
    return allowEmpty ? emptyAs : String(min)
  }
  let n = roundMoney(text, Number.NaN)
  if (!Number.isFinite(n)) return allowEmpty ? emptyAs : String(min)
  if (n < min) n = min
  if (max != null && Number.isFinite(Number(max)) && n > Number(max)) n = Number(max)
  return formatMoneyInput(n)
}
