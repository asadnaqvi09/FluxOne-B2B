import { useState, useMemo } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StatCard } from '@/components/shared/StatsCards'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NativeSelect } from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BRAND } from '@/lib/constants'
import { toastSuccess } from '@/lib/toast'
import { INITIAL_INVOICES_DATA } from '@/data/adminInvoicesMock'
import {
  FileText,
  Download,
  Printer,
  Calendar,
  CreditCard,
  CheckCircle2,
  Receipt,
  Search,
  Building,
  Layers,
} from 'lucide-react'

const MONTHS_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const PAGE_SIZE = 8

export function InvoicesPage() {
  const [invoices] = useState(INITIAL_INVOICES_DATA)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [page, setPage] = useState(1)

  // Filter logic
  const filteredInvoices = invoices.filter((inv) => {
    const matchesMonth = selectedMonth === 'all' ? true : inv.month === selectedMonth
    const matchesYear = selectedYear === 'all' ? true : inv.year === selectedYear
    const matchesSearch =
      inv.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.dateTime.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesMonth && matchesYear && matchesSearch
  })

  // Open Preview Modal
  function handlePreviewInvoice(inv) {
    setSelectedInvoice(inv)
    setPreviewOpen(true)
  }

  // Generate & Print clean 1-page official invoice receipt
  function handlePrintInvoice(inv = selectedInvoice) {
    if (!inv) return
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) {
      toastSuccess(`Invoice ${inv.trackingId} ready`)
      return
    }

    const itemsHtml = (inv.items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13px;">${item.description}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a; font-size: 13px;">Rs. ${item.amount.toLocaleString()}</td>
        </tr>
      `,
      )
      .join('')

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice_${inv.trackingId}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #ffffff; color: #0f172a; padding: 20px; line-height: 1.5; }
            .invoice-wrapper { max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
            .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
            .brand-title { font-size: 20px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.02em; }
            .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .status-pill { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; font-size: 12px; }
            .meta-box { background: #f8fafc; border: 1px solid #f1f5f9; padding: 14px 16px; border-radius: 12px; }
            .meta-title { color: #94a3b8; font-weight: 700; text-transform: uppercase; font-size: 10px; margin-bottom: 4px; letter-spacing: 0.05em; }
            .meta-name { font-weight: 800; font-size: 13px; color: #0f172a; }
            .meta-desc { color: #475569; font-size: 11px; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1.5px solid #cbd5e1; padding: 8px 0; }
            .total-row td { border-top: 2px solid #0f172a; border-bottom: none; font-size: 16px; font-weight: 800; padding: 16px 0 0 0; color: #412283; }
            .footer-note { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 14px; }
            @media print {
              body { padding: 0; }
              .invoice-wrapper { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <div class="header-row">
              <div>
                <div class="brand-title">FluxOne Enterprise Solutions Ltd.</div>
                <div class="brand-sub">NTN: 8923410-7 · FBR Compliant & Verified</div>
                <div class="brand-sub">support@fluxone.b2b · +92 51 2223344</div>
              </div>
              <div style="text-align: right;">
                <div class="status-pill">Status: ${inv.status}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">${inv.dateTime}</div>
                <div style="font-family: monospace; font-size: 12px; font-weight: 800; color: #8e238f; margin-top: 2px;">${inv.trackingId}</div>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                <div class="meta-title">Billed To</div>
                <div class="meta-name">Asad Naqvi (B2B Owner)</div>
                <div class="meta-desc">Company A Enterprise Network</div>
                <div class="meta-desc">Wah Cantt · Haripur · Taxilla · Islamabad</div>
              </div>
              <div class="meta-box">
                <div class="meta-title">Billing & Payment</div>
                <div class="meta-name">${inv.paymentMethod}</div>
                <div class="meta-desc">Billing Cycle: ${inv.billingCycle}</div>
                <div class="meta-desc">Plan: ${inv.source}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description / Licensed Products</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td>Total Paid Amount</td>
                  <td style="text-align: right;">${inv.formattedPrice}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer-note">
              Official Tax Invoice Receipt · Computer Generated · Thank you for your business with FluxOne
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() {
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(invoiceHtml)
    printWindow.document.close()
  }

  // Trigger Download PDF action via print-to-pdf stream
  function handleDownloadPDF(inv = selectedInvoice) {
    toastSuccess(`Generating PDF for ${inv.trackingId}…`)
    handlePrintInvoice(inv)
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Billing & Licensing"
          title="Subscription & Invoices"
          description="View enterprise platform subscriptions, licensing history, and download official payment receipts"
        />
      </MotionHeader>

      {/* Top Subscription Summary Stats */}
      <MotionReveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            index={0}
            label="Active Tier"
            value="Enterprise Multi-Branch"
            subtitle="4 Active Stores · Unlimited POS Terminals"
            badge="4 Branches"
            icon={Building}
          />
          <StatCard
            index={1}
            label="Next Billing Renewal"
            value="01 Oct 2026"
            subtitle="Auto-debit active via HBL Corporate"
            badge="Auto-Pay"
            icon={Calendar}
          />
          <StatCard
            index={2}
            label="YTD Total Invoiced"
            value="Rs. 367,000"
            subtitle="9 Invoices logged (2026 Season)"
            badge="YTD 2026"
            icon={Receipt}
          />
        </div>
      </MotionReveal>

      {/* Filters Bar (Month & Year) */}
      <MotionReveal delay={0.1}>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Tracking ID or Source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filter by Month */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5">
              <Calendar className="size-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Month:</span>
              <NativeSelect
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-7 border-0 bg-transparent py-0 text-xs font-semibold text-slate-800 shadow-none focus:ring-0"
              >
                {MONTHS_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {/* Filter by Year */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5">
              <span className="text-xs text-slate-500 font-medium">Year:</span>
              <NativeSelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-7 border-0 bg-transparent py-0 text-xs font-semibold text-slate-800 shadow-none focus:ring-0"
              >
                <option value="all">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </NativeSelect>
            </div>
          </div>
        </div>
      </MotionReveal>

      {/* List of Invoices Table */}
      <MotionReveal delay={0.15}>
        <SurfaceCard
          title="Invoices & Payment History"
          description={`Showing ${filteredInvoices.length} billing records with official receipt downloads`}
          actions={
            <span className="text-xs font-medium text-slate-400">
              {filteredInvoices.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="overflow-x-auto">
            <Table className="min-w-[42rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs text-slate-500 uppercase">
                  <TableHead className="px-4 py-3 font-medium">Tracking ID</TableHead>
                  <TableHead className="px-4 py-3 font-medium">Date & Time</TableHead>
                  <TableHead className="px-4 py-3 font-medium">Name of Source / Plan</TableHead>
                  <TableHead className="px-4 py-3 font-medium">Price</TableHead>
                  <TableHead className="px-4 py-3 font-medium">Status</TableHead>
                  <TableHead className="px-4 py-3 text-right font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No invoices found matching the selected month and year.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((inv) => (
                      <TableRow
                        key={inv.trackingId}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="px-4 py-3.5 font-bold text-slate-900">
                          <span className="rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-700 border border-purple-100 font-mono font-bold">
                            {inv.trackingId}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                          {inv.dateTime}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                          {inv.source}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-extrabold text-slate-900">
                          {inv.formattedPrice}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                          >
                            <CheckCircle2 className="mr-1 size-3" />
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewInvoice(inv)}
                              className="h-8 text-xs cursor-pointer"
                            >
                              <FileText className="mr-1 size-3.5" />
                              View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleDownloadPDF(inv)}
                              className="h-8 text-xs text-white cursor-pointer font-semibold"
                              style={{ background: BRAND.purple }}
                            >
                              <Download className="mr-1 size-3.5" />
                              Download PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE))}
            totalItems={filteredInvoices.length}
            onPageChange={setPage}
          />
        </SurfaceCard>
      </MotionReveal>

      {/* Invoice PDF Preview & Download Modal */}
      {selectedInvoice && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Official Billing Invoice</span>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {selectedInvoice.trackingId}
                </span>
              </DialogTitle>
              <DialogDescription>
                Tax compliant invoice receipt for FluxOne B2B platform licensing
              </DialogDescription>
            </DialogHeader>

            {/* Printable Invoice Sheet */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    FluxOne Enterprise Solutions Ltd.
                  </h4>
                  <p className="text-[11px] text-slate-500">NTN: 8923410-7 · FBR Compliant</p>
                  <p className="text-[11px] text-slate-500">support@fluxone.b2b</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase text-[10px]">
                    Status: {selectedInvoice.status}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">{selectedInvoice.dateTime}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Billed To:</span>
                  <p className="font-bold text-slate-900">Asad Naqvi (B2B Owner)</p>
                  <p className="text-slate-600">Company A Network (Wah Cantt / Haripur / Taxilla / Islamabad)</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Payment Mode:</span>
                  <p className="font-semibold text-slate-800">{selectedInvoice.paymentMethod}</p>
                  <p className="text-slate-600">{selectedInvoice.billingCycle}</p>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-slate-200 pt-2">
                <Table className="w-full text-left">
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                      <TableHead className="py-1">Description</TableHead>
                      <TableHead className="py-1 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-2 text-slate-700">{item.description}</TableCell>
                        <TableCell className="py-2 text-right font-semibold text-slate-900">
                          Rs. {item.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-t-2 border-slate-900 font-extrabold text-sm text-slate-900">
                      <TableCell className="py-2">Total Paid:</TableCell>
                      <TableCell className="py-2 text-right text-purple-900">
                        {selectedInvoice.formattedPrice}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintInvoice}
                className="cursor-pointer"
              >
                <Printer className="mr-1.5 size-4" />
                Print
              </Button>
              <Button
                type="button"
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="text-white cursor-pointer"
                style={{ background: BRAND.purple }}
              >
                <Download className="mr-1.5 size-4" />
                Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default InvoicesPage
