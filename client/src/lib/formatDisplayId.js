// Format a UUID as a prefixed display reference (UI only — not stored in DB).
export function referenceFromUuid(id, prefix = 'REF') {
  if (!id) return '—'
  const compact = String(id).replace(/-/g, '').slice(0, 8).toUpperCase()
  return `${prefix}-${compact}`
}

export function displayMovementRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'STK') : '—'
}

export function displaySupplierRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'SUP') : '—'
}
