import { validatePhone } from './formValidators'

// Required supplier fields aligned with SupplierFormDialog + API.
export function validateSupplierForm(form) {
  if (!String(form.companyName || '').trim()) {
    return 'Company name is required'
  }
  const companyPhoneErr = validatePhone(form.companyPhone, {
    required: true,
    fieldName: 'Company contact number',
  })
  if (companyPhoneErr) {
    return companyPhoneErr
  }
  if (!String(form.representativeName || '').trim()) {
    return 'Representative name is required'
  }
  const repPhoneErr = validatePhone(form.representativePhone, {
    required: true,
    fieldName: 'Representative contact number',
  })
  if (repPhoneErr) {
    return repPhoneErr
  }
  const email = String(form.representativeEmail || '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Representative email is not valid'
  }
  return null
}
