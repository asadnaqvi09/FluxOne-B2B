import { validateEmail, validatePhone } from './formValidators'
import { firstValidationMessage } from './fieldErrors'

const FIELD_ORDER = [
  'companyName',
  'companyPhone',
  'representativeName',
  'representativePhone',
  'representativeEmail',
]

// Returns { fieldKey: message } — empty object when valid
export function validateSupplierFormFields(form = {}) {
  const errors = {}

  if (!String(form.companyName || '').trim()) {
    errors.companyName = 'Company name is required'
  }

  const companyPhoneErr = validatePhone(form.companyPhone, {
    required: true,
    fieldName: 'Company contact number',
  })
  if (companyPhoneErr) errors.companyPhone = companyPhoneErr

  if (!String(form.representativeName || '').trim()) {
    errors.representativeName = 'Representative name is required'
  }

  const repPhoneErr = validatePhone(form.representativePhone, {
    required: true,
    fieldName: 'Representative contact number',
  })
  if (repPhoneErr) errors.representativePhone = repPhoneErr

  const emailErr = validateEmail(form.representativeEmail, {
    required: false,
    fieldName: 'Representative email',
  })
  if (emailErr) errors.representativeEmail = emailErr

  return errors
}

// @deprecated string message — prefer validateSupplierFormFields
export function validateSupplierForm(form) {
  return firstValidationMessage(validateSupplierFormFields(form), FIELD_ORDER)
}

export const SUPPLIER_FIELD_ORDER = FIELD_ORDER
