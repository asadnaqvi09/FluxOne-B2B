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

export function displayStaffRef(row = {}) {
  const id = row.id || row.staffId
  return id ? referenceFromUuid(id, 'STF') : '—'
}

export function displayDiscountRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'OFF') : '—'
}

/** Prefer real product item_code; fall back to ITM-XXXXXXXX from UUID. */
export function displayItemCode(row = {}) {
  const code = row.itemCode || row.item_code
  if (code) return String(code)
  const id = row.id || row.productId
  return id ? referenceFromUuid(id, 'ITM') : '—'
}
