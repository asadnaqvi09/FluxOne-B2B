// Shared product CSV helpers for Import / Export.
// Format matches productsToCsv / parseProductsCsv.

export const PRODUCT_CSV_HEADERS = [
  'itemCode',
  'name',
  'barcode',
  'type',
  'scale',
  'status',
  'purchasePrice',
  'sellingPrice',
  'quantity',
]

// Escape one CSV cell.
export function escapeCsvCell(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

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

export function productsToCsv(rows = []) {
  const lines = [PRODUCT_CSV_HEADERS.join(',')]
  for (const row of rows) {
    lines.push(
      PRODUCT_CSV_HEADERS.map((key) => {
        if (key === 'itemCode') return escapeCsvCell(row.itemCode || row.sku || '')
        return escapeCsvCell(row[key])
      }).join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

// Parse CSV text into import rows for POST /inventory/products/import.
// Accepts export headers or legacy sku,name,barcode,quantity,scale.
export function parseProductsCsv(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '')
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const first = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const looksLikeHeader =
    first.includes('itemcode') ||
    first.includes('sku') ||
    first.includes('name') ||
    (first[0] === 'itemcode' && first[1] === 'name')

  let headers = null
  let startIndex = 0
  if (looksLikeHeader && (first.includes('name') || first.includes('itemcode') || first.includes('sku'))) {
    headers = first
    startIndex = 1
  }

  const rows = []
  for (let i = startIndex; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i])
    if (!cells.length || cells.every((c) => !c)) continue

    let row
    if (headers) {
      const get = (...names) => {
        for (const name of names) {
          const idx = headers.indexOf(name)
          if (idx >= 0 && cells[idx] != null && cells[idx] !== '') return cells[idx]
        }
        return undefined
      }
      row = {
        sku: get('itemcode', 'sku', 'item_code') || '',
        name: get('name') || '',
        barcode: get('barcode') || undefined,
        type: get('type') || undefined,
        scale: get('scale') || undefined,
        quantity: get('quantity') != null ? Number(get('quantity')) : undefined,
        purchasePrice: get('purchaseprice', 'purchase_price') != null
          ? Number(get('purchaseprice', 'purchase_price'))
          : undefined,
        sellingPrice: get('sellingprice', 'selling_price') != null
          ? Number(get('sellingprice', 'selling_price'))
          : undefined,
      }
    } else {
      // Legacy positional: sku,name,barcode?,quantity?,scale?
      row = {
        sku: cells[0] || '',
        name: cells[1] || '',
        barcode: cells[2] || undefined,
        quantity: cells[3] ? Number(cells[3]) : undefined,
        scale: cells[4] || undefined,
      }
    }

    if (!row.sku || !row.name) continue
    if (Number.isNaN(row.quantity)) row.quantity = undefined
    if (Number.isNaN(row.purchasePrice)) row.purchasePrice = undefined
    if (Number.isNaN(row.sellingPrice)) row.sellingPrice = undefined
    rows.push(row)
  }

  return rows
}

export function downloadTextFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function productCsvTemplate() {
  return productsToCsv([
    {
      itemCode: 'BEV-001',
      name: 'Cola 1.5L',
      barcode: '8901234567890',
      type: 'single',
      scale: 'unit',
      status: 'active',
      purchasePrice: 80,
      sellingPrice: 120,
      quantity: 48,
    },
  ])
}
