// Parse HH:MM or HH:MM:SS to minutes since midnight; returns null if empty/invalid.
export function parseTimeToMinutes(value) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function formatMinutesLabel(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function hasValue(value) {
  return value != null && String(value).trim() !== ''
}

// Soft UI note when admin has not configured branch hours yet.
export function getBranchHoursSoftWarning(branchHours) {
  if (!branchHours) return null
  if (hasValue(branchHours.openingTime) && hasValue(branchHours.closingTime)) return null
  return 'Branch opening hours are not set — shift is not limited to a branch window.'
}

// Validate staff shift + break window.
// Rules: start < end; break must be a range inside the shift when any break field is set.
// When branchHours are set, shift must fall inside opening→closing (same-day Phase 1).
export function validateStaffSchedule(fields, branchHours = null) {
  const start = parseTimeToMinutes(fields.scheduleStart)
  const end = parseTimeToMinutes(fields.scheduleEnd)
  const breakStart = parseTimeToMinutes(fields.scheduleBreakStart)
  const breakEnd = parseTimeToMinutes(fields.scheduleBreakEnd)

  const hasStart = fields.scheduleStart != null && String(fields.scheduleStart).trim() !== ''
  const hasEnd = fields.scheduleEnd != null && String(fields.scheduleEnd).trim() !== ''
  const hasBreakStart =
    fields.scheduleBreakStart != null && String(fields.scheduleBreakStart).trim() !== ''
  const hasBreakEnd =
    fields.scheduleBreakEnd != null && String(fields.scheduleBreakEnd).trim() !== ''

  if (hasStart !== hasEnd) {
    return 'Set both start and end time, or leave both empty'
  }

  if (hasStart && hasEnd) {
    if (start == null || end == null) {
      return 'Start and end time must be valid (HH:MM)'
    }
    if (start >= end) {
      return 'End time must be after start time'
    }

    if (
      branchHours &&
      hasValue(branchHours.openingTime) &&
      hasValue(branchHours.closingTime)
    ) {
      const open = parseTimeToMinutes(branchHours.openingTime)
      const close = parseTimeToMinutes(branchHours.closingTime)
      if (open != null && close != null && (start < open || end > close)) {
        return `Shift must be within branch hours (${formatMinutesLabel(open)}–${formatMinutesLabel(close)})`
      }
    }
  }

  if (hasBreakStart !== hasBreakEnd) {
    return 'Set both break start and break end, or leave break empty'
  }

  if (hasBreakStart && hasBreakEnd) {
    if (breakStart == null || breakEnd == null) {
      return 'Break times must be valid (HH:MM)'
    }
    if (breakStart >= breakEnd) {
      return 'Break end must be after break start'
    }
    if (!hasStart || !hasEnd) {
      return 'Set shift start and end before adding a break'
    }
    if (breakStart < start || breakEnd > end) {
      return 'Break must fall within the shift (between start and end time)'
    }
  }

  return null
}

// Staff create/edit fields (excludes schedule — use validateStaffSchedule).
export function validateStaffForm(fields, { isEdit = false, branchHours = null } = {}) {
  if (!String(fields.fullName || '').trim()) {
    return 'Name is required'
  }
  if (!String(fields.email || '').trim()) {
    return 'ID (login) is required'
  }
  if (!isEdit && (!fields.password || String(fields.password).length < 8)) {
    return 'Password must be at least 8 characters'
  }
  if (isEdit && fields.password && String(fields.password).length < 8) {
    return 'Password must be at least 8 characters'
  }
  return validateStaffSchedule(fields, branchHours)
}
