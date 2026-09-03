import { useEffect, useState, useMemo } from 'react'
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
  TablePagination,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogCancelButton } from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

const PAGE_SIZE = 8

export function SalesPage() {
  const [sales, setSales] = useState([])
  const [kpis, setKpis] = useState({ totalSales: 0, totalRefunds: 0, transactionCount: 0, totalPaid: 0, totalReturns: 0 })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Refund dialog
  const [refundTarget, setRefundTarget] = useState(null)
  const [refunding, setRefunding] = useState(false)

  // Invoice view dialog
  const [invoiceTarget, setInvoiceTarget] = useState(null)

  const fetchSales = async () => {
    setLoading(true)
    const params = {}
    if (searchQuery.trim()) params.q = searchQuery
    if (filterDate) params.date = filterDate
    if (filterCategory) params.categoryId = filterCategory

    const res = await apiClient.get(endpoints.branch.sales.list, params)
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
    void fetchCategories()
  }, [searchQuery, filterDate, filterCategory])

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
          actions={
            <span className="text-xs font-medium text-slate-400">
              {sales.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-slate-500 text-xs">
                  <TableHead>ID</TableHead>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Sale items</TableHead>
                  <TableHead>Exchange item</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-slate-400">Loading transactions...</TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-slate-400">No transactions found</TableCell>
                  </TableRow>
                ) : (
                  sales
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((sale) => {
                      const soldItems = (sale.items || []).filter((i) => !i.isExchange)
                      const exchangeItems = (sale.items || []).filter((i) => i.isExchange)
                      
                      // Simple SAL ID backfill logic to match design (e.g. SAL-1001)
                      const indexStr = String(sale.saleNumber || sale.id.slice(0, 4))
                      const salId = `SAL-${indexStr}`
                      const trkId = `TRK-${indexStr}`

                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 font-semibold rounded hover:bg-purple-100 border-none">
                              {salId}
                            </Badge>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{trkId}</div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {new Date(sale.soldAt).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div className="max-w-[200px] truncate" title={soldItems.map((i) => i.name).join(', ')}>
                              {soldItems.map((i) => `${i.name}`).join(', ') || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {exchangeItems.map((i) => i.name).join(', ') || '—'}
                          </TableCell>
                          <TableCell className="text-slate-600">Rs. {formatPrice(sale.tax_amount || sale.taxAmount)}</TableCell>
                          <TableCell className="text-slate-600">Rs. {formatPrice(sale.discount_amount || sale.discountAmount)}</TableCell>
                          <TableCell className="font-bold text-slate-900">Rs. {formatPrice(sale.finalAmount)}</TableCell>
                          <TableCell className="text-slate-600">Rs. {formatPrice(sale.paidAmount)}</TableCell>
                          <TableCell className="text-slate-600">
                            {parseFloat(sale.returnAmount) > 0 ? `Rs. ${formatPrice(sale.returnAmount)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2.5">
                            {sale.status !== 'refunded' ? (
                              <Button
                                size="xs"
                                variant="outline"
                                className="text-xs h-7 border-slate-200 text-slate-700 font-semibold px-2 hover:bg-slate-50 align-middle"
                                onClick={() => setRefundTarget(sale)}
                              >
                                Refund
                              </Button>
                            ) : (
                              <Badge variant="destructive" className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-none font-semibold rounded align-middle">Refunded</Badge>
                            )}
                            <button
                              type="button"
                              className="text-slate-500 hover:text-slate-800 transition-colors inline-block align-middle"
                              onClick={() => handlePrint(sale)}
                            >
                              <Printer className="size-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={Math.max(1, Math.ceil(sales.length / PAGE_SIZE))}
            totalItems={sales.length}
            onPageChange={setPage}
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
