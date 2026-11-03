// Control movement CSV helpers — Export (tab-specific, not Products CSV).
import { rowsToCsv, downloadCsv } from '@/lib/export/csvExport'

export const CONTROL_CSV_HEADERS = [
  'S.N.',
  'Date & Time',
  'SKU / Item ID',
  'Barcode',
  'Product Name',
  'Category',
  'Sub Category',
  'Item Type',
  'Variant Type',
  'Variant Value',
  'Stock In Qty',
  'Old Purchasing Price (PKR)',
  'New Purchasing Price (PKR)',
  'Old Selling Price (PKR)',
  'New Selling Price (PKR)',
  'Company / Supplier',
  'Notes / Source',
]

// Helper to format prices exactly like the screenshot: Rs 75.00
function formatPrice(value, forcePkrSuffix = false) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  
  const formatted = `Rs ${num.toFixed(2)}`
  if (forcePkrSuffix) return `${formatted} PKR`
  return formatted
}

// Helper to format date like screenshot: 2026-10-29 08:41 PM
function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  
  const date = d.toISOString().split('T')[0]
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // the hour '0' should be '12'
  const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm
  
  return `${date} ${strTime}`
}

// Map API export rows → CSV download for active tab.
export function downloadControlExport(rows, movementType) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) throw new Error('No rows to export')

  const dataRows = list.map((row, index) => {
    // 1. Variant Parsing
    let vType = '—';
    let vValue = '—';
    if (row.variantLabel) {
      const parts = String(row.variantLabel).split('|')[0].split(':');
      if (parts.length >= 2) {
        vType = parts[0].trim();
        vValue = parts.slice(1).join(':').trim();
      } else {
        vValue = parts[0].trim();
      }
    }

    // 2. Notes & Source Combining (Fixes the cut-off issue)
    let notesSource = row.reason || '';
    if (row.notes && !notesSource.includes(row.notes)) {
      notesSource = notesSource ? `${notesSource} - ${row.notes}` : row.notes;
    }
    if (!notesSource.trim()) {
      notesSource = row.movementType === 'in' ? 'Opening stock' : '—';
    }

    // 3. Item Type Formatting
    let itemType = '—';
    if (row.productType === 'single') itemType = 'Single Item';
    else if (row.productType === 'bundle') itemType = 'Bundle';
    else if (row.productType) itemType = row.productType;

    // 4. Category & Subcategory fallbacks
    const category = row.categoryName || row.category || '—';
    const subCategory = row.subcategoryName || row.subcategory || '—';
    const supplier = row.supplierName || row.supplier || '—';
    const productName = row.productName || row.name || '—';

    return [
      index + 1,                                        // 1. S.N.
      formatDateTime(row.createdAt || row.dateTime),    // 2. Date & Time
      row.itemCode || row.sku || '—',                   // 3. SKU / Item ID
      row.barcode || '—',                               // 4. Barcode
      productName,                                      // 5. Product Name
      category,                                         // 6. Category
      subCategory,                                      // 7. Sub Category
      itemType,                                         // 8. Item Type
      vType,                                            // 9. Variant Type
      vValue,                                           // 10. Variant Value
      row.quantity ?? '',                               // 11. Stock In Qty
      formatPrice(row.oldPurchasePrice),                // 12. Old Purchasing Price
      formatPrice(row.newPurchasePrice || row.unitCost, true), // 13. New Purchasing Price
      formatPrice(row.oldSellingPrice),                 // 14. Old Selling Price
      formatPrice(row.newSellingPrice, true),           // 15. New Selling Price
      supplier,                                         // 16. Company / Supplier
      notesSource.trim(),                               // 17. Notes / Source
    ]
  })

  const csv = rowsToCsv(CONTROL_CSV_HEADERS, dataRows)
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`fluxone-control-${movementType || 'export'}-${stamp}.csv`, csv)
}