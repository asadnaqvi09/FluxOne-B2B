// Branch Manager form validators (Resources, Discounts, shared field rules).

import { validatePercentage } from '@/lib/validation/formValidators'

const HARDWARE_TYPES = new Set(['Computers', 'Scanners', 'Printers', 'Telephone', 'Other'])
const HARDWARE_STATUSES = new Set(['New', 'Used', 'Good', 'Poor'])

export function validateHardwareForm(fields = {}, { isCreate = true } = {}) {
  const name = String(fields.name || '').trim()
  const companyName = String(fields.companyName || '').trim()
  const type = fields.type
  const status = fields.status

  // Hardware ID is server-generated on create (same pattern as staff/discount refs).
  if (!isCreate) {
    const code = String(fields.code || '').trim()
    if (!code) return 'Hardware ID is missing'
  }

  if (!name) return 'Hardware name is required'
  if (name.length < 2) return 'Hardware name must be at least 2 characters'
  if (!companyName) return 'Company / brand name is required'
  if (!type) return 'Select a device type'
  if (!HARDWARE_TYPES.has(type)) return 'Select a valid device type'
  if (!status) return 'Select a status'
  if (!HARDWARE_STATUSES.has(status)) return 'Select a valid status'
  return null
}

export function validateItemScaleForm(fields = {}) {
  const name = String(fields.name || '').trim()
  if (!name) return 'Scale name is required'
  if (name.length > 40) return 'Scale name must be 40 characters or less'
  if (!/^[A-Za-z0-9.\-/%\s]+$/.test(name)) {
    return 'Scale name may only contain letters, numbers, spaces, and . - / %'
  }
  return null
}

export function validateDiscountForm(fields = {}) {
  const name = String(fields.name || '').trim()
  if (!name) return 'Campaign name / explanation is required'
  if (name.length < 2) return 'Campaign name must be at least 2 characters'
  if (name.length > 120) return 'Campaign name must be 120 characters or less'

  const percentError = validatePercentage(fields.percent, {
    min: 0,
    max: 100,
    fieldName: 'Discount percentage',
  })
  if (percentError) return percentError

  return null
}

export function validateHolidayForm(fields = {}) {
  const name = String(fields.name || '').trim()
  if (!name) return 'Holiday name is required'
  if (!fields.startDate) return 'Start date is required'
  if (!fields.endDate) return 'End date is required'
  if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) {
    return 'End date must be on or after start date'
  }
  return null
}

export function validateLeaveForm(fields = {}) {
  if (!fields.startDate) return 'Start date is required'
  if (!fields.endDate) return 'End date is required'
  if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) {
    return 'End date must be on or after start date'
  }
  return null
}
