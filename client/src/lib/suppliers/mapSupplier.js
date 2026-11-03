// Map live IM supplier API rows to UI shape.
// (Older mock mapper used name/phone — live API uses companyName / companyPhone.)
export function mapSupplier(row = {}) {
  return {
    id: row.id,
    companyName: row.companyName || row.company_name || row.name || '',
    imageUrl: row.imageUrl || row.image_url || null,
    companyPhone: row.companyPhone || row.company_phone || row.phone || '',
    representativeName:
      row.representativeName || row.representative_name || row.contactName || '',
    representativePhone:
      row.representativePhone || row.representative_phone || '',
    representativeEmail:
      row.representativeEmail || row.representative_email || row.email || '',
    location: row.location || row.city || '',
    taxPaid: Boolean(row.taxPaid ?? row.tax_paid ?? false),
    registrationNumber: row.registrationNumber || row.registration_number || '',
    bankAccountNumber: row.bankAccountNumber || row.bank_account_number || '',
    signatureUrl: row.signatureUrl || row.signature_url || null,
    isActive: row.isActive ?? row.is_active ?? true,
  }
}

// Build JSON or multipart body for create/update.
export function buildSupplierPayload(fields) {
  const base = {
    companyName: String(fields.companyName || '').trim(),
    companyPhone: fields.companyPhone?.trim() || undefined,
    representativeName: fields.representativeName?.trim() || undefined,
    representativePhone: fields.representativePhone?.trim() || undefined,
    representativeEmail: fields.representativeEmail?.trim() || undefined,
    location: fields.location?.trim() || undefined,
    taxPaid: Boolean(fields.taxPaid),
    registrationNumber: fields.registrationNumber?.trim() || undefined,
    bankAccountNumber: fields.bankAccountNumber?.trim() || undefined,
  }

  const hasImage = fields.image instanceof File && fields.image.size > 0
  const hasSignature = fields.signature instanceof File && fields.signature.size > 0

  if (!hasImage && !hasSignature) return base

  const form = new FormData()
  Object.entries(base).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    form.append(key, String(value))
  })
  if (hasImage) form.append('image', fields.image)
  if (hasSignature) form.append('signature', fields.signature)
  return form
}
