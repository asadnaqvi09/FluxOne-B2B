// Shared product CSV helpers — Import / Export use the same columns (1:1).
// rowKind: product | variant | bundle_item

export const PRODUCT_CSV_HEADERS = [
  'rowKind',
  'itemCode',
  'name',
  'barcode',
  'type',
  'scale',
  'status',
  'category',
  'subcategory',
  'purchasePrice',
  'sellingPrice',
  'stockQuantity',
  'threshold',
  'description',
  'discountPercent',
  'offerName',
  'taxPercent',
  'dailyPriceChange',
  'parentItemCode',
  'variantLabel',
  'variantOptions',
  'componentItemCode',
  'componentQty',
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

function numOrUndef(value) {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

function boolOrUndef(value) {
  if (value == null || value === '') return undefined
  const v = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(v)) return true
  if (['0', 'false', 'no', 'n'].includes(v)) return false
  return undefined
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')
}

/** Map API/export row fields → CSV column values (headers use stockQuantity / threshold). */
function csvValueForHeader(key, row) {
  if (key === 'itemCode') return row.itemCode || row.sku || ''
  if (key === 'stockQuantity') {
    const v = row.stockQuantity ?? row.quantity
    return v == null || v === '' ? '' : v
  }
  if (key === 'threshold') {
    const v = row.threshold ?? row.reorderPoint
    return v == null || v === '' ? '' : v
  }
  if (key === 'dailyPriceChange') {
    if (row.dailyPriceChange == null || row.dailyPriceChange === '') return ''
    return row.dailyPriceChange ? 'true' : 'false'
  }
  return row[key] ?? ''
}

/** After CSV parse — API import expects quantity / reorderPoint. */
function mapParsedRowForApi(row) {
  if (row.stockQuantity !== undefined) row.quantity = row.stockQuantity
  else if (row.quantity !== undefined) row.stockQuantity = row.quantity

  if (row.threshold !== undefined) row.reorderPoint = row.threshold
  else if (row.reorderPoint !== undefined) row.threshold = row.reorderPoint

  return row
}

// Serialize catalog rows → CSV text (same shape Import expects).
export function productsToCsv(rows = []) {
  const lines = [PRODUCT_CSV_HEADERS.join(',')]
  for (const row of rows) {
    lines.push(
      PRODUCT_CSV_HEADERS.map((key) => escapeCsvCell(csvValueForHeader(key, row))).join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

// Parse CSV text → import rows for POST /inventory/products/import.
// Supports full headers, legacy short headers, and positional sku,name,...
export function parseProductsCsv(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '')
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const first = parseCsvLine(lines[0]).map(normalizeHeader)
  const looksLikeHeader =
    first.includes('itemcode') ||
    first.includes('sku') ||
    first.includes('name') ||
    first.includes('rowkind')

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
          const idx = headers.indexOf(normalizeHeader(name))
          if (idx >= 0 && cells[idx] != null && cells[idx] !== '') return cells[idx]
        }
        return undefined
      }

      const itemCode = get('itemCode', 'sku', 'item_code') || ''
      const rowKindRaw = (get('rowKind', 'row_kind') || 'product').toLowerCase()
      const rowKind =
        rowKindRaw === 'variant' || rowKindRaw === 'bundle_item' || rowKindRaw === 'bundleitem'
          ? rowKindRaw === 'bundleitem'
            ? 'bundle_item'
            : rowKindRaw
          : 'product'

      row = {
        rowKind,
        itemCode,
        sku: itemCode,
        name: get('name') || '',
        barcode: get('barcode') || undefined,
        type: get('type') || undefined,
        scale: get('scale') || undefined,
        status: get('status') || undefined,
        category: get('category', 'categoryName', 'category_name') || undefined,
        subcategory: get('subcategory', 'subcategoryName', 'subcategory_name') || undefined,
        stockQuantity: numOrUndef(
          get('stockQuantity', 'stockquantity', 'quantity', 'stock_quantity'),
        ),
        purchasePrice: numOrUndef(get('purchasePrice', 'purchase_price')),
        sellingPrice: numOrUndef(get('sellingPrice', 'selling_price')),
        threshold: numOrUndef(
          get('threshold', 'reorderpoint', 'reorderPoint', 'reorder_point'),
        ),
        description: get('description') || undefined,
        discountPercent: numOrUndef(get('discountPercent', 'discount_percent')),
        offerName: get('offerName', 'offer_name') || undefined,
        taxPercent: numOrUndef(get('taxPercent', 'tax_percent')),
        dailyPriceChange: boolOrUndef(get('dailyPriceChange', 'daily_price_change')),
        parentItemCode: get('parentItemCode', 'parent_item_code', 'parentSku') || undefined,
        variantLabel: get('variantLabel', 'variant_label') || undefined,
        variantOptions: get('variantOptions', 'variant_options') || undefined,
        componentItemCode: get('componentItemCode', 'component_item_code') || undefined,
        componentQty: numOrUndef(get('componentQty', 'component_qty')),
      }
    } else {
      // Legacy positional: sku,name,barcode?,quantity?,scale?
      row = {
        rowKind: 'product',
        itemCode: cells[0] || '',
        sku: cells[0] || '',
        name: cells[1] || '',
        barcode: cells[2] || undefined,
        quantity: numOrUndef(cells[3]),
        scale: cells[4] || undefined,
        type: 'single',
      }
    }

    // product rows need sku+name; child rows need parent link
    if (row.rowKind === 'product') {
      if (!row.itemCode || !row.name) continue
    } else if (row.rowKind === 'variant') {
      if (!row.parentItemCode || !row.itemCode) continue
    } else if (row.rowKind === 'bundle_item') {
      if (!row.parentItemCode || !row.componentItemCode) continue
    }

    rows.push(mapParsedRowForApi(row))
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

// Template covers single + variant children + bundle components
export function productCsvTemplate() {
  return productsToCsv([
    {
      rowKind: 'product',
      itemCode: 'BEV-001',
      name: 'Cola 1.5L',
      barcode: '8901234567890',
      type: 'single',
      scale: 'unit',
      status: 'active',
      category: 'Beverages',
      subcategory: 'Soft Drinks',
      purchasePrice: 80,
      sellingPrice: 120,
      stockQuantity: 48,
      threshold: 10,
      description: 'Sample single item',
      discountPercent: 0,
      offerName: '',
      taxPercent: 10,
      dailyPriceChange: false,
    },
    {
      rowKind: 'product',
      itemCode: 'TEE-PARENT',
      name: 'T-Shirt',
      barcode: '8901000000001',
      type: 'variant',
      scale: 'unit',
      status: 'active',
      category: 'Apparel',
      subcategory: 'Tops',
      purchasePrice: 0,
      sellingPrice: 0,
      stockQuantity: 0,
      threshold: 10,
      description: 'Variant parent',
      taxPercent: 10,
    },
    {
      rowKind: 'variant',
      itemCode: 'TEE-RED-M',
      name: 'T-Shirt',
      barcode: '8901000000002',
      type: 'single',
      scale: 'unit',
      status: 'active',
      parentItemCode: 'TEE-PARENT',
      variantLabel: 'Red–M',
      variantOptions: 'Color:Red|Size:M',
      purchasePrice: 200,
      sellingPrice: 350,
      stockQuantity: 12,
      threshold: 5,
      dailyPriceChange: false,
    },
    {
      rowKind: 'product',
      itemCode: 'BND-001',
      name: 'Snack Bundle',
      barcode: '8902000000001',
      type: 'bundle',
      scale: 'unit',
      status: 'active',
      category: 'Bundles',
      subcategory: '',
      purchasePrice: 0,
      sellingPrice: 500,
      stockQuantity: 5,
      threshold: 2,
      description: 'Sample bundle',
      taxPercent: 10,
    },
    {
      rowKind: 'bundle_item',
      parentItemCode: 'BND-001',
      componentItemCode: 'BEV-001',
      componentQty: 2,
    },
  ])
}
