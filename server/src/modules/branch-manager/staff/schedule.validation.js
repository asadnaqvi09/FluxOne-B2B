import { z } from 'zod'

// Shift + break window validation for staff create/update.
function parseTimeToMinutes(value) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function hasValue(value) {
  return value != null && String(value).trim() !== ''
}

function formatMinutesLabel(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

// When branch hours exist, shift must sit inside the open→close window.
// If hours are unset, allow the shift (soft policy — admin can set hours later).
// Returns an error string or null.
export function validateShiftAgainstBranchHours(schedule, branchHours) {
  const openingTime = branchHours?.openingTime
  const closingTime = branchHours?.closingTime
  if (!hasValue(openingTime) || !hasValue(closingTime)) return null

  const hasStart = hasValue(schedule?.scheduleStart)
  const hasEnd = hasValue(schedule?.scheduleEnd)
  if (!hasStart || !hasEnd) return null

  const start = parseTimeToMinutes(schedule.scheduleStart)
  const end = parseTimeToMinutes(schedule.scheduleEnd)
  const open = parseTimeToMinutes(openingTime)
  const close = parseTimeToMinutes(closingTime)
  if (start == null || end == null || open == null || close == null) return null

  if (start < open || end > close) {
    return `Shift must be within branch hours (${formatMinutesLabel(open)}–${formatMinutesLabel(close)})`
  }
  return null
}

// Append Zod issues when shift/break times are illogical.
export function refineStaffSchedule(body, ctx) {
  const hasStart = hasValue(body.scheduleStart)
  const hasEnd = hasValue(body.scheduleEnd)
  const hasBreakStart = hasValue(body.scheduleBreakStart)
  const hasBreakEnd = hasValue(body.scheduleBreakEnd)

  if (hasStart !== hasEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Set both schedule start and end, or leave both empty',
      path: ['body', 'scheduleEnd'],
    })
    return
  }

  if (hasStart && hasEnd) {
    const start = parseTimeToMinutes(body.scheduleStart)
    const end = parseTimeToMinutes(body.scheduleEnd)
    if (start == null || end == null) return
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Schedule end must be after start',
        path: ['body', 'scheduleEnd'],
      })
    }
  }

  if (hasBreakStart !== hasBreakEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Set both break start and break end, or leave break empty',
      path: ['body', 'scheduleBreakEnd'],
    })
    return
  }

  if (!hasBreakStart) return

  const start = parseTimeToMinutes(body.scheduleStart)
  const end = parseTimeToMinutes(body.scheduleEnd)
  const breakStart = parseTimeToMinutes(body.scheduleBreakStart)
  const breakEnd = parseTimeToMinutes(body.scheduleBreakEnd)

  if (!hasStart || !hasEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Shift start and end are required when setting a break',
      path: ['body', 'scheduleStart'],
    })
    return
  }

  if (breakStart == null || breakEnd == null) return

  if (breakStart >= breakEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Break end must be after break start',
      path: ['body', 'scheduleBreakEnd'],
    })
  }

  if (breakStart < start || breakEnd > end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Break must fall within the shift (between start and end)',
      path: ['body', 'scheduleBreakStart'],
    })
  }
}
