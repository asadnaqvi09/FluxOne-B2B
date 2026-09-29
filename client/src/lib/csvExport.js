// Shared CSV / Excel-compatible export helpers (reuse across admin & branch pages).

export function escapeCsvCell(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function rowsToCsv(headers = [], rows = []) {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','))
  }
  return lines.join('\n')
}

// UTF-8 BOM so Excel opens international characters correctly
export function downloadCsv(filename, csvContent) {
  const safeName = String(filename || 'export.csv').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportRowsToCsv({ filename, headers, rows }) {
  if (!rows?.length) {
    throw new Error('No rows to export')
  }
  downloadCsv(filename, rowsToCsv(headers, rows))
}
