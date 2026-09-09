import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StatCard } from '@/components/shared/StatsCards'
import { EmptyState } from '@/components/shared/EmptyState'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
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
import {
  ADMIN_INVOICES_PAGE_SIZE,
  useAdminInvoices,
} from '@/hooks/useAdminInvoices'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { BRAND } from '@/lib/constants'
import { downloadBillingInvoicePdf } from '@/lib/pdfDownload'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Receipt,
  Search,
  Building,
  Loader2,
  ReceiptText,
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

const PAGE_SIZE = ADMIN_INVOICES_PAGE_SIZE

function formatRenewal(dateValue) {
  if (!dateValue) return 'Not scheduled'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return 'Not scheduled'
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function InvoicesPage() {
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, selectedMonth, selectedYear])

  const {
    items: invoices,
    summary,
    pagination,
    loading,
    summaryLoading,
    error,
  } = useAdminInvoices({
    q: debouncedQ,
    month: selectedMonth,
    year: selectedYear,
    page,
    limit: PAGE_SIZE,
  })

  const { company } = useAdminCompany()
  const slowHint = useSlowLoadingHint(loading)
  const hasFilters =
    Boolean(debouncedQ) || selectedMonth !== 'all' || selectedYear !== 'all'

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return [current, current - 1, current - 2]
  }, [])

  function handlePreviewInvoice(inv) {
    setSelectedInvoice(inv)
    setPreviewOpen(true)
  }

  function handleDownloadPDF(inv = selectedInvoice) {
    if (!inv) return
    try {
      downloadBillingInvoicePdf(inv, {
        name: company?.name,
        supportEmail: company?.supportEmail,
        registrationTaxId: company?.registrationTaxId,
      })
      toastSuccess(`Downloaded ${inv.trackingId}`)
    } catch (err) {
      toastError(err?.message || 'Failed to generate PDF')
    }
  }

  function handlePrintInvoice(inv = selectedInvoice) {
    if (!inv) return
    handleDownloadPDF(inv)
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

      <SlowLoadingBanner show={slowHint} />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <MotionReveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            index={0}
            label="Active Tier"
            value={
              summaryLoading
                ? '—'
                : summary.planName || (summary.totalCount > 0 ? 'Platform License' : 'No plan yet')
            }
            subtitle={
              summary.branchCount > 0
                ? `${summary.branchCount} active branch${summary.branchCount === 1 ? '' : 'es'}`
                : 'No open branches yet'
            }
            badge={summary.branchLimit ? `${summary.branchLimit} limit` : 'SaaS'}
            icon={Building}
          />
          <StatCard
            index={1}
            label="Next Billing Renewal"
            value={summaryLoading ? '—' : formatRenewal(summary.nextRenewalAt)}
            subtitle={
              summary.autoPay
                ? `Auto-pay · ${summary.paymentMethod || 'Configured'}`
                : 'Manual billing · no gateway yet'
            }
            badge={summary.autoPay ? 'Auto-Pay' : 'Manual'}
            icon={Calendar}
          />
          <StatCard
            index={2}
            label="YTD Total Invoiced"
            value={summaryLoading ? '—' : summary.ytdFormatted || 'Rs. 0'}
            subtitle={
              summary.ytdCount > 0
                ? `${summary.ytdCount} invoice${summary.ytdCount === 1 ? '' : 's'} this year`
                : 'No invoices logged yet'
            }
            badge={`YTD ${new Date().getFullYear()}`}
            icon={Receipt}
          />
        </div>
      </MotionReveal>

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

            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-2.5 py-1.5">
              <span className="text-xs text-slate-500 font-medium">Year:</span>
              <NativeSelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-7 border-0 bg-transparent py-0 text-xs font-semibold text-slate-800 shadow-none focus:ring-0"
              >
                <option value="all">All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.15}>
        <SurfaceCard
          title="Invoices & Payment History"
          description="SaaS platform billing records (not POS sales)"
          actions={
            <span className="text-xs font-medium text-slate-400">
              {pagination.total} records · {PAGE_SIZE} / page
            </span>
          }
        >
          {loading && invoices.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading invoices…
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title={
                hasFilters
                  ? 'No invoices match these filters'
                  : 'No subscription invoices yet'
              }
              description={
                hasFilters
                  ? 'Try another month/year or clear the search.'
                  : 'Billing invoices will appear here when SaaS subscription charges are issued for this company. Payment gateway is out of scope for this phase.'
              }
              compact
            />
          ) : (
            <>
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
                    {invoices.map((inv) => (
                      <TableRow key={inv.id || inv.trackingId} className="hover:bg-slate-50/50 transition-colors">
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                page={pagination.page || page}
                pageCount={pagination.pageCount || 1}
                onPageChange={setPage}
                loading={loading}
              />
            </>
          )}
        </SurfaceCard>
      </MotionReveal>

      {selectedInvoice && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-3">
                <span>Official Billing Invoice</span>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {selectedInvoice.trackingId}
                </span>
              </DialogTitle>
              <DialogDescription>
                SaaS platform licensing receipt for this company
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {company?.name || 'FluxOne'}
                  </h4>
                  {company?.registrationTaxId ? (
                    <p className="text-[11px] text-slate-500">Tax ID: {company.registrationTaxId}</p>
                  ) : null}
                  {company?.supportEmail ? (
                    <p className="text-[11px] text-slate-500">{company.supportEmail}</p>
                  ) : null}
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
                  <span className="text-slate-400 block font-medium">Plan / Source:</span>
                  <p className="font-bold text-slate-900">{selectedInvoice.source}</p>
                  <p className="text-slate-600">{selectedInvoice.billingCycle || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Payment Mode:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedInvoice.paymentMethod || '—'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2">
                <Table className="w-full text-left">
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                      <TableHead className="py-1">Description</TableHead>
                      <TableHead className="py-1 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedInvoice.items?.length
                      ? selectedInvoice.items
                      : [{ description: selectedInvoice.source, amount: selectedInvoice.price }]
                    ).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-2 text-slate-700">{item.description}</TableCell>
                        <TableCell className="py-2 text-right font-semibold text-slate-900">
                          Rs. {Number(item.amount || 0).toLocaleString()}
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
                onClick={() => handlePrintInvoice(selectedInvoice)}
                className="cursor-pointer"
              >
                <Printer className="mr-1.5 size-4" />
                Print / PDF
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
