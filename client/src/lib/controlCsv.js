// Control movement CSV helpers — Export / Import (tab-specific, not Products CSV).
import { escapeCsvCell, rowsToCsv, downloadCsv } from '@/lib/csvExport'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export const CONTROL_CSV_HEADERS = [
  'itemCode',
  'barcode',
  'quantity',
  'scale',
  'reason',
  'variantType',
  'variantValue',
  'unitCost',
  'damagedByEmail',
  'damagedLocation',
  'notes',
]

// Parse a CSV line respecting quoted fields.
export function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function numOrUndef(value) {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

export function controlCsvTemplate(movementType) {
  const headers = CONTROL_CSV_HEADERS.join(',')
  if (movementType === MOVEMENT_TYPES.DAMAGED) {
    return `${headers}\nITEM001,,2,unit,Broken in transit,,,,"user@example.com",warehouse,`
  }
  if (movementType === MOVEMENT_TYPES.IN) {
    return `${headers}\nITEM001,,10,unit,Restock note,,,120,,,`
  }
  // Adjustment / Others — signed qty + reason
  return `${headers}\nITEM001,,-1,unit,Misc correction,,,,,,`
}

export function parseControlCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i])
    const row = {}
    headers.forEach((key, idx) => {
      row[key] = cells[idx] ?? ''
    })
    const parsed = {
      itemCode: row.itemCode || undefined,
      barcode: row.barcode || undefined,
      quantity: numOrUndef(row.quantity),
      scale: row.scale || undefined,
      reason: row.reason || undefined,
      notes: row.notes || undefined,
      variantType: row.variantType || undefined,
      variantValue: row.variantValue || undefined,
      unitCost: numOrUndef(row.unitCost),
      damagedByEmail: row.damagedByEmail || undefined,
      damagedLocation: row.damagedLocation || undefined,
    }
    if (parsed.quantity == null && !parsed.itemCode && !parsed.barcode) continue
    rows.push(parsed)
  }
  return rows
}

function splitVariantLabel(label) {
  const text = String(label || '')
  const idx = text.indexOf(':')
  if (idx <= 0) return { variantType: '', variantValue: text }
  return {
    variantType: text.slice(0, idx).trim(),
    variantValue: text.slice(idx + 1).trim(),
  }
}

// Map API export rows → CSV download for active tab.
export function downloadControlExport(rows, movementType) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) throw new Error('No rows to export')

  const dataRows = list.map((row) => {
    const { variantType, variantValue } = splitVariantLabel(row.variantLabel)
    return [
      row.itemCode || '',
      row.barcode || '',
      row.quantity ?? '',
      row.scale || '',
      row.reason || '',
      variantType,
      variantValue,
      row.unitCost ?? '',
      row.damagedByEmail || '',
      row.damagedLocation || '',
      row.reason || '',
    ]
  })

  const csv = rowsToCsv(CONTROL_CSV_HEADERS, dataRows)
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`fluxone-control-${movementType || 'export'}-${stamp}.csv`, csv)
}

export function downloadControlTemplate(movementType) {
  downloadCsv(
    `fluxone-control-${movementType || 'movements'}-template.csv`,
    controlCsvTemplate(movementType),
  )
}

export { escapeCsvCell }
