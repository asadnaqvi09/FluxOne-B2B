// Required supplier fields aligned with SupplierFormDialog + API.
export function validateSupplierForm(form) {
  if (!String(form.companyName || '').trim()) {
    return 'Company name is required'
  }
  if (!String(form.companyPhone || '').trim()) {
    return 'Company contact number is required'
  }
  if (!String(form.representativeName || '').trim()) {
    return 'Representative name is required'
  }
  if (!String(form.representativePhone || '').trim()) {
    return 'Representative contact number is required'
  }
  const email = String(form.representativeEmail || '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Representative email is not valid'
  }
  return null
}
