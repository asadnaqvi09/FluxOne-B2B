/**
 * System-wide date/time display helpers.
 * Rule: 12-hour clock with AM/PM everywhere in the UI (all roles).
 * API / DB may still store clock values as HH:MM (24h); convert with formatClockTime for display.
 * When both date + time show in a cell, stack with formatDateTimeParts (date top, time bottom).
 */

const EMPTY = '—'

function toValidDate(value) {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

// Uppercase AM/PM for consistent UI (e.g. "02:32 PM")
function withUpperAmPm(text) {
  return String(text).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
}

/** Date only — "25 Sept 2026" */
export function formatDateLine(value) {
  const date = toValidDate(value)
  if (!date) return EMPTY
  try {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return EMPTY
  }
}

/**
 * Clock-only value ("9:00", "18:00:00") → "09:00 AM" / "06:00 PM".
 * Use for branch hours, staff shifts, and break times (API still stores HH:MM).
 */
export function formatClockTime(value) {
  if (value == null || value === '') return ''
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  let hour = Number(match[1])
  const minute = match[2]
  if (!Number.isFinite(hour) || hour > 23 || hour < 0) return ''
  const period = hour >= 12 ? 'PM' : 'AM'
  hour %= 12
  if (hour === 0) hour = 12
  return `${String(hour).padStart(2, '0')}:${minute} ${period}`
}

/** Time only — "02:32 PM" (always 12-hour) */
export function formatTimeLine(value) {
  const date = toValidDate(value)
  if (!date) return EMPTY
  try {
    return withUpperAmPm(
      date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    )
  } catch {
    return EMPTY
  }
}

/**
 * Split date + time for two-line UI cells.
 * { date: "25 Sept 2026", time: "02:32 PM" }
 */
export function formatDateTimeParts(value) {
  const date = toValidDate(value)
  if (!date) return { date: EMPTY, time: EMPTY }
  return {
    date: formatDateLine(date),
    time: formatTimeLine(date),
  }
}

/**
 * Single-line for PDF / CSV / inline text:
 * "25 Sept 2026, 02:32 PM"
 */
export function formatDateTimeInline(value) {
  const parts = formatDateTimeParts(value)
  if (parts.date === EMPTY) return EMPTY
  if (parts.time === EMPTY) return parts.date
  return `${parts.date}, ${parts.time}`
}

/** Default alias — prefer formatDateTimeParts + two-line JSX in tables */
export function formatDateTime(value) {
  return formatDateTimeInline(value)
}
