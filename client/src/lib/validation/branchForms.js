// Branch Manager form validators (Resources, Discounts, shared field rules).

import { validatePercentage } from '@/lib/validation/formValidators'
import { firstValidationMessage } from '@/lib/validation/fieldErrors'

const HARDWARE_TYPES = new Set(['Computers', 'Scanners', 'Printers', 'Telephone', 'Other'])
const HARDWARE_STATUSES = new Set(['New', 'Used', 'Good', 'Poor'])

export function validateHardwareFormFields(fields = {}, { isCreate = true } = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  const companyName = String(fields.companyName || '').trim()
  const type = fields.type
  const status = fields.status

  if (!isCreate) {
    const code = String(fields.code || '').trim()
    if (!code) errors.code = 'Hardware ID is missing'
  }

  if (!name) errors.name = 'Hardware name is required'
  else if (name.length < 2) errors.name = 'Hardware name must be at least 2 characters'

  if (!companyName) errors.companyName = 'Company / brand name is required'
  if (!type) errors.type = 'Select a device type'
  else if (!HARDWARE_TYPES.has(type)) errors.type = 'Select a valid device type'
  if (!status) errors.status = 'Select a status'
  else if (!HARDWARE_STATUSES.has(status)) errors.status = 'Select a valid status'

  return errors
}

export function validateHardwareForm(fields = {}, opts = {}) {
  return firstValidationMessage(validateHardwareFormFields(fields, opts), [
    'code',
    'name',
    'companyName',
    'type',
    'status',
  ])
}

export function validateItemScaleFormFields(fields = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Scale name is required'
  else if (name.length > 40) errors.name = 'Scale name must be 40 characters or less'
  else if (!/^[A-Za-z0-9.\-/%\s]+$/.test(name)) {
    errors.name = 'Scale name may only contain letters, numbers, spaces, and . - / %'
  }
  return errors
}

export function validateItemScaleForm(fields = {}) {
  return firstValidationMessage(validateItemScaleFormFields(fields), ['name'])
}

export function validateDiscountFormFields(fields = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Campaign name / explanation is required'
  else if (name.length < 2) errors.name = 'Campaign name must be at least 2 characters'
  else if (name.length > 120) errors.name = 'Campaign name must be 120 characters or less'

  const percentError = validatePercentage(fields.percent, {
    min: 0,
    max: 100,
    fieldName: 'Discount percentage',
  })
  if (percentError) errors.percent = percentError

  return errors
}

export function validateDiscountForm(fields = {}) {
  return firstValidationMessage(validateDiscountFormFields(fields), ['name', 'percent'])
}

export function validateHolidayFormFields(fields = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Holiday name is required'
  if (!fields.startDate) errors.startDate = 'Start date is required'
  if (!fields.endDate) errors.endDate = 'End date is required'
  if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) {
    errors.endDate = 'End date must be on or after start date'
  }
  return errors
}

export function validateHolidayForm(fields = {}) {
  return firstValidationMessage(validateHolidayFormFields(fields), [
    'name',
    'startDate',
    'endDate',
  ])
}

export function validateLeaveFormFields(fields = {}) {
  const errors = {}
  if (!fields.startDate) errors.startDate = 'Start date is required'
  if (!fields.endDate) errors.endDate = 'End date is required'
  if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) {
    errors.endDate = 'End date must be on or after start date'
  }
  return errors
}

export function validateLeaveForm(fields = {}) {
  return firstValidationMessage(validateLeaveFormFields(fields), ['startDate', 'endDate'])
}
