import { jsPDF } from 'jspdf'
import { downloadBillingInvoicePdf } from '@/lib/pdfDownload'
import { currencyAmountLabel, DEFAULT_CURRENCY, formatMoney, normalizeCurrency } from '@/lib/currency'

function safeFilename(value, fallback = 'download') {
  const base = String(value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return base || fallback
}

function escapeCsvCell(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadTextFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Export the full table of invoices to Excel-compatible CSV with UTF-8 BOM
 */
export function exportInvoicesToExcel(
  invoices = [],
  { companyName = 'FluxOne', filterMonth = 'all', filterYear = 'all', currency } = {},
) {
  if (!invoices.length) {
    throw new Error('No invoices to export')
  }

  const code = normalizeCurrency(currency || invoices[0]?.currency || DEFAULT_CURRENCY)

  const lines = [
    `"${companyName} - Invoices & Payment History Report"`,
    `"Exported Date: ${new Date().toLocaleString()}"`,
    `"Period Filter: ${filterMonth !== 'all' ? `Month ${filterMonth}, ` : ''}${filterYear !== 'all' ? `Year ${filterYear}` : 'All Time'}"`,
    `"Total Records: ${invoices.length}"`,
    '',
    [
      'Tracking ID',
      'Date & Time',
      'Plan / Source',
      currencyAmountLabel('Price', code),
      'Status',
      'Billing Cycle',
      'Payment Method',
    ]
      .map((h) => `"${h}"`)
      .join(','),
  ]

  let totalAmount = 0

  invoices.forEach((inv) => {
    const priceNum = Number(inv.price) || 0
    totalAmount += priceNum
    lines.push(
      [
        escapeCsvCell(inv.trackingId || ''),
        escapeCsvCell(inv.dateTime || ''),
        escapeCsvCell(inv.source || ''),
        priceNum,
        escapeCsvCell(inv.status || 'Paid'),
        escapeCsvCell(inv.billingCycle || 'Monthly'),
        escapeCsvCell(inv.paymentMethod || 'Manual'),
      ].join(','),
    )
  })

  // Summary row
  lines.push('')
  lines.push(`"Total Invoiced Amount",,,,${totalAmount},,`)

  const content = '\uFEFF' + lines.join('\r\n')
  const filename = `fluxone-invoices-report-${new Date().toISOString().slice(0, 10)}.csv`
  downloadTextFile(filename, content, 'text/csv;charset=utf-8')
  return { filename, count: invoices.length }
}

/**
 * Export a single invoice record to Excel-compatible CSV
 */
export function exportSingleInvoiceToExcel(invoice, company = {}) {
  if (!invoice) throw new Error('Invoice is missing')

  const companyName = company.name || 'FluxOne Enterprise Solutions'
  const code = normalizeCurrency(invoice.currency || company.currency || DEFAULT_CURRENCY)
  const lines = [
    `"${companyName} - Official Billing Invoice"`,
    `"Tracking ID:",${escapeCsvCell(invoice.trackingId || '')}`,
    `"Date & Time:",${escapeCsvCell(invoice.dateTime || '')}`,
    `"Plan / Source:",${escapeCsvCell(invoice.source || '')}`,
    `"Status:",${escapeCsvCell(invoice.status || 'Paid')}`,
    `"Billing Cycle:",${escapeCsvCell(invoice.billingCycle || 'Monthly')}`,
    `"Payment Method:",${escapeCsvCell(invoice.paymentMethod || 'Manual')}`,
    `"${currencyAmountLabel('Total Amount', code)}:",${Number(invoice.price || 0)}`,
  ]

  const items = Array.isArray(invoice.items) && invoice.items.length
    ? invoice.items
    : [{ description: invoice.source || 'Platform Subscription', amount: invoice.price }]

  lines.push('')
  lines.push(`"${'Line Item Description'}","${currencyAmountLabel('Amount', code)}"`)
  items.forEach((item) => {
    lines.push(`${escapeCsvCell(item.description || '')},${Number(item.amount || 0)}`)
  })

  lines.push('')
  lines.push(`"Total Paid",${Number(invoice.price || 0)}`)

  const content = '\uFEFF' + lines.join('\r\n')
  const filename = `invoice-${safeFilename(invoice.trackingId || 'receipt')}.csv`
  downloadTextFile(filename, content, 'text/csv;charset=utf-8')
  return { filename }
}

/**
 * Export the full table of invoices to a formatted PDF report document
 */
export function downloadInvoicesTablePdf(
  invoices = [],
  {
    company = {},
    filterMonth = 'all',
    filterYear = 'all',
    monthLabel = 'All Months',
    searchQuery = '',
    currency,
  } = {},
) {
  if (!invoices.length) {
    throw new Error('No invoices to export')
  }

  const reportCurrency = normalizeCurrency(
    currency || invoices[0]?.currency || DEFAULT_CURRENCY,
  )
  const money = (amount) => formatMoney(amount, reportCurrency)

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const margin = 14
  let y = 18

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(company.name || 'FluxOne Enterprise Solutions', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  y += 5
  doc.text('Subscription & Billing Invoices Report', margin, y)
  if (company.registrationTaxId) {
    y += 4
    doc.text(`Tax ID: ${company.registrationTaxId}`, margin, y)
  }
  doc.setTextColor(0)

  // Report Date & Meta on the right
  const nowStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  doc.setFontSize(8.5)
  doc.text(`Generated: ${nowStr}`, 196, 18, { align: 'right' })

  const filterParts = []
  if (filterMonth !== 'all') filterParts.push(monthLabel)
  if (filterYear !== 'all') filterParts.push(filterYear)
  if (searchQuery) filterParts.push(`Search: "${searchQuery}"`)
  const filterSummary = filterParts.length ? filterParts.join(' · ') : 'All Periods'

  doc.text(`Filter: ${filterSummary}`, 196, 23, { align: 'right' })
  doc.text(`Total Records: ${invoices.length}`, 196, 28, { align: 'right' })

  y = Math.max(y + 8, 35)
  doc.setDrawColor(220)
  doc.line(margin, y, 196, y)
  y += 6

  // Table Column Definitions
  const cols = [
    { label: 'Tracking ID', x: margin + 2, w: 32 },
    { label: 'Date & Time', x: margin + 35, w: 38 },
    { label: 'Plan / Source', x: margin + 74, w: 56 },
    { label: 'Status', x: margin + 132, w: 22 },
    { label: currencyAmountLabel('Price', reportCurrency), x: 194, w: 26, align: 'right' },
  ]

  function renderTableHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setFillColor(243, 238, 255) // soft purple header
    doc.rect(margin, y - 4, 196 - margin, 7, 'F')
    doc.setTextColor(75, 40, 130)
    cols.forEach((col) => {
      if (col.align === 'right') doc.text(col.label, col.x, y, { align: 'right' })
      else doc.text(col.label, col.x, y)
    })
    doc.setTextColor(0)
    y += 5
  }

  renderTableHeader()
  doc.setFont('helvetica', 'normal')
  let totalAmount = 0

  invoices.forEach((inv, index) => {
    if (y > 270) {
      doc.addPage()
      y = 18
      renderTableHeader()
      doc.setFont('helvetica', 'normal')
    }

    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 252)
      doc.rect(margin, y - 3.5, 196 - margin, 6.5, 'F')
    }

    const priceNum = Number(inv.price) || 0
    totalAmount += priceNum

    doc.setFontSize(8)
    doc.text(String(inv.trackingId || '—'), cols[0].x, y)
    doc.text(String(inv.dateTime || '—'), cols[1].x, y)
    const sourceText = doc.splitTextToSize(String(inv.source || '—'), cols[2].w)
    doc.text(sourceText[0] || '—', cols[2].x, y)
    doc.text(String(inv.status || 'Paid'), cols[3].x, y)
    doc.text(
      String(inv.formattedPrice || money(priceNum)),
      cols[4].x,
      y,
      { align: 'right' },
    )

    y += 6.5
  })

  // Total Footer
  y += 2
  doc.setDrawColor(200)
  doc.line(margin, y, 196, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Total Invoiced Amount', cols[0].x, y)
  doc.text(money(totalAmount), cols[4].x, y, { align: 'right' })

  const filename = `fluxone-invoices-report-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
  return { filename }
}

export { downloadBillingInvoicePdf }
