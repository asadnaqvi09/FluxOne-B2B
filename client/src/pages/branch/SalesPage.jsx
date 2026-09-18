import { useEffect, useRef, useState } from 'react'
import {
  Search,
  Printer,
  AlertTriangle,
  Receipt,
  CircleDollarSign,
  CreditCard,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { StatCard } from '@/components/shared/StatsCards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogCancelButton } from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useClientPagination } from '@/hooks/useClientPagination'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

export function SalesPage() {
  const [sales, setSales] = useState([])
  const [kpis, setKpis] = useState({ totalSales: 0, totalRefunds: 0, transactionCount: 0, totalPaid: 0, totalReturns: 0 })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedSales,
  } = useClientPagination(sales)

  // Filters — input is instant; API uses debounced query
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery, 300)
  const [filterDate, setFilterDate] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const fetchSeq = useRef(0)

  // Refund dialog
  const [refundTarget, setRefundTarget] = useState(null)
  const [refunding, setRefunding] = useState(false)

  // Invoice view dialog
  const [invoiceTarget, setInvoiceTarget] = useState(null)

  const fetchSales = async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    const params = {}
    if (debouncedQ.trim()) params.q = debouncedQ.trim()
    if (filterDate) params.date = filterDate
    if (filterCategory) params.categoryId = filterCategory

    const res = await apiClient.get(endpoints.branch.sales.list, params)
    // Drop stale responses so fast typing does not flash old results
    if (seq !== fetchSeq.current) return

    setLoading(false)
    if (res.success && res.data) {
      const items = res.data.items || []
      setSales(items)
      
      // Calculate exact KPIs from returned items
      const transactionCount = items.length
      const totalSales = items.reduce((acc, s) => acc + parseFloat(s.finalAmount || 0), 0)
      const totalPaid = items.reduce((acc, s) => acc + parseFloat(s.paidAmount || 0), 0)
      const totalReturns = items.reduce((acc, s) => acc + parseFloat(s.returnAmount || 0), 0)

      setKpis({
        totalSales,
        totalRefunds: items.filter((s) => s.status === 'refunded').length,
        transactionCount,
        totalPaid,
        totalReturns,
      })
    }
  }

  const fetchCategories = async () => {
    const res = await apiClient.get('/inventory/products/categories')
    if (res.success && res.data) {
      setCategories(res.data || [])
    }
  }

  useEffect(() => {
    void fetchSales()
  }, [debouncedQ, filterDate, filterCategory])

  useEffect(() => {
    void fetchCategories()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, filterDate, filterCategory])

  const handleRefund = async () => {
    if (!refundTarget) return
    setRefunding(true)
    const res = await apiClient.post(endpoints.branch.sales.refund(refundTarget.id))
    setRefunding(false)
    if (res.success) {
      toastSuccess('Sale refunded successfully')
      setRefundTarget(null)
      void fetchSales()
    } else {
      toastError(res.error || 'Failed to refund sale')
    }
  }

  const handlePrint = (sale) => {
    setInvoiceTarget(sale)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  const formatPrice = (val) => {
    const num = parseFloat(val || 0)
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Transactions"
          title="Sales Management"
          description="Transactions, refunds, and invoice print. Online customer management is Phase 2."
        />
      </MotionHeader>

      {/* Reusable KPI Stat Cards (4 Columns) */}
      <MotionReveal delay={0.02}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            label="Transactions"
            value={kpis.transactionCount || sales.length || 0}
            subtitle="Total sales orders processed"
            badge="Orders"
            icon={Receipt}
          />
          <StatCard
            index={1}
            label="Net Sales"
            value={`Rs. ${formatPrice(kpis.totalSales)}`}
            subtitle="Gross transaction revenue"
            badge="Gross"
            icon={CircleDollarSign}
          />
          <StatCard
            index={2}
            label="Paid Amount"
            value={`Rs. ${formatPrice(kpis.totalPaid)}`}
            subtitle="Settled cash & POS cards"
            badge="Settled"
            icon={CreditCard}
          />
          <StatCard
            index={3}
            label="Returns & Refunds"
            value={`Rs. ${formatPrice(kpis.totalReturns)}`}
            subtitle={`${kpis.totalRefunds || 0} refunds recorded`}
            badge="Returns"
            icon={ArrowDownRight}
          />
        </div>
      </MotionReveal>

      {/* Search & Filters */}
      <MotionReveal delay={0.04}>
        <SurfaceCard padding="compact">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="sales-search"
                  value={searchQuery}
                  placeholder="Search sale ID / tracking ID"
                  className="pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Input
                id="sales-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <NativeSelect
                id="sales-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.filter((c) => !c.parentId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </SurfaceCard>
      </MotionReveal>

      {/* Table grid matching exactly to image, using Shadcn Table component */}
      <MotionReveal delay={0.06}>
        <SurfaceCard
          title="Sales Transactions"
          description="POS and register transactions history"
          className="min-h-[400px]"
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading transactions...</p>
          ) : sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No transactions found</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {pagedSales.map((sale) => {
                  const soldItems = (sale.items || []).filter((i) => !i.isExchange)
                  const exchangeItems = (sale.items || []).filter((i) => i.isExchange)
                  const indexStr = String(sale.saleNumber || sale.id.slice(0, 4))
                  const salId = `SAL-${indexStr}`
                  const trkId = `TRK-${indexStr}`
                  const soldAtLabel = new Date(sale.soldAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })

                  return (
                    <article
                      key={sale.id}
                      className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-purple-800 select-all">
                            {salId}
                          </span>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400">{trkId}</p>
                          <p className="mt-1 text-xs text-slate-500">{soldAtLabel}</p>
                        </div>
                        {sale.status === 'refunded' ? (
                          <Badge
                            variant="destructive"
                            className="rounded border-none bg-rose-50 font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Refunded
                          </Badge>
                        ) : null}
                      </div>

                      <p className="mt-2 truncate text-sm text-slate-700" title={soldItems.map((i) => i.name).join(', ')}>
                        {soldItems.map((i) => i.name).join(', ') || '—'}
                      </p>
                      {exchangeItems.length > 0 ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          Exchange: {exchangeItems.map((i) => i.name).join(', ')}
                        </p>
                      ) : null}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">Final</span>
                          <p className="font-bold text-slate-900">Rs. {formatPrice(sale.finalAmount)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Paid</span>
                          <p className="font-semibold text-slate-700">Rs. {formatPrice(sale.paidAmount)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Tax</span>
                          <p className="text-slate-600">Rs. {formatPrice(sale.tax_amount || sale.taxAmount)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Discount</span>
                          <p className="text-slate-600">
                            Rs. {formatPrice(sale.discount_amount || sale.discountAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        {sale.status !== 'refunded' ? (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => setRefundTarget(sale)}
                          >
                            Refund
                          </Button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex text-slate-500 transition-colors hover:text-slate-800"
                          onClick={() => handlePrint(sale)}
                          aria-label="Print invoice"
                        >
                          <Printer className="size-4" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[56rem]">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500">
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Sale items</TableHead>
                      <TableHead className="hidden lg:table-cell">Exchange item</TableHead>
                      <TableHead className="hidden xl:table-cell">Tax</TableHead>
                      <TableHead className="hidden xl:table-cell">Discount</TableHead>
                      <TableHead>Final</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="hidden lg:table-cell">Return</TableHead>
                      <TableActionsHead sticky />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedSales.map((sale) => {
                      const soldItems = (sale.items || []).filter((i) => !i.isExchange)
                      const exchangeItems = (sale.items || []).filter((i) => i.isExchange)
                      const indexStr = String(sale.saleNumber || sale.id.slice(0, 4))
                      const salId = `SAL-${indexStr}`
                      const trkId = `TRK-${indexStr}`

                      return (
                        <TableRow key={sale.id} className="group">
                          <TableCell className="py-4">
                            <span className="font-mono text-xs font-bold text-purple-800 select-all">
                              {salId}
                            </span>
                            <div className="mt-0.5 font-mono text-[10px] text-slate-400">{trkId}</div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {new Date(sale.soldAt).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div
                              className="max-w-[200px] truncate"
                              title={soldItems.map((i) => i.name).join(', ')}
                            >
                              {soldItems.map((i) => i.name).join(', ') || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-slate-500 lg:table-cell">
                            {exchangeItems.map((i) => i.name).join(', ') || '—'}
                          </TableCell>
                          <TableCell className="hidden text-slate-600 xl:table-cell">
                            Rs. {formatPrice(sale.tax_amount || sale.taxAmount)}
                          </TableCell>
                          <TableCell className="hidden text-slate-600 xl:table-cell">
                            Rs. {formatPrice(sale.discount_amount || sale.discountAmount)}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">
                            Rs. {formatPrice(sale.finalAmount)}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            Rs. {formatPrice(sale.paidAmount)}
                          </TableCell>
                          <TableCell className="hidden text-slate-600 lg:table-cell">
                            {parseFloat(sale.returnAmount) > 0
                              ? `Rs. ${formatPrice(sale.returnAmount)}`
                              : '—'}
                          </TableCell>
                          <TableActionsCell sticky>
                            {sale.status !== 'refunded' ? (
                              <Button
                                size="xs"
                                variant="outline"
                                className="h-7 border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => setRefundTarget(sale)}
                              >
                                Refund
                              </Button>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="rounded border-none bg-rose-50 font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Refunded
                              </Badge>
                            )}
                            <button
                              type="button"
                              className="cursor-pointer text-slate-500 transition-colors hover:text-slate-800"
                              onClick={() => handlePrint(sale)}
                              aria-label="Print invoice"
                            >
                              <Printer className="size-4" />
                            </button>
                          </TableActionsCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </SurfaceCard>
      </MotionReveal>

      {/* Refund Approval Dialog */}
      <Dialog open={Boolean(refundTarget)} onOpenChange={(open) => { if (!open) setRefundTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              Approve Refund request?
            </DialogTitle>
            <DialogDescription>
              This will mark the selected invoice as **Refunded** and return the full payment amount back to the customer.
            </DialogDescription>
          </DialogHeader>

          {refundTarget && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
              <div><strong>Invoice:</strong> {refundTarget.saleNumber}</div>
              <div><strong>Amount to Refund:</strong> Rs. {formatPrice(refundTarget.finalAmount)}</div>
            </div>
          )}

          <DialogFooter>
            <DialogCancelButton disabled={refunding} className="w-full sm:w-auto" />
            <Button
              onClick={handleRefund}
              disabled={refunding}
              className="text-white w-full sm:w-auto"
              style={{ backgroundColor: BRAND.purple }}
            >
              {refunding ? 'Refunding…' : 'Approve Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Print Preview Dialog */}
      <Dialog open={Boolean(invoiceTarget)} onOpenChange={(open) => { if (!open) setInvoiceTarget(null) }}>
        <DialogContent className="max-w-sm p-6 bg-white font-mono text-xs border border-slate-300 rounded-none shadow-none print:p-0 print:border-none print:shadow-none">
          {invoiceTarget && (
            <div className="space-y-4">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <div className="text-base font-bold">SOFTWARE FLUX SOLUTION</div>
                <div>Branch Manager Terminal</div>
                <div className="text-[10px] text-slate-400">Date: {new Date(invoiceTarget.soldAt).toLocaleString()}</div>
                <div>Invoice: {invoiceTarget.saleNumber}</div>
              </div>
              <div className="space-y-2 border-b border-dashed border-slate-400 pb-3">
                <div className="flex justify-between font-bold">
                  <span>Item Name</span>
                  <span>Total</span>
                </div>
                {(invoiceTarget.items || []).map((i) => (
                  <div key={i.id} className="flex justify-between text-slate-600">
                    <span>{i.name} (x{parseInt(i.quantity)})</span>
                    <span>Rs. {formatPrice(i.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Rs. {formatPrice(invoiceTarget.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount</span>
                  <span>Rs. {formatPrice(invoiceTarget.tax_amount || invoiceTarget.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>- Rs. {formatPrice(invoiceTarget.discount_amount || invoiceTarget.discountAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-400 pt-2">
                  <span>FINAL TOTAL</span>
                  <span>Rs. {formatPrice(invoiceTarget.finalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Paid amount</span>
                  <span>Rs. {formatPrice(invoiceTarget.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Return Amount</span>
                  <span>Rs. {formatPrice(invoiceTarget.returnAmount)}</span>
                </div>
              </div>
              <div className="text-center text-[10px] border-t border-dashed border-slate-400 pt-3">
                Thank you for your business!
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default SalesPage
