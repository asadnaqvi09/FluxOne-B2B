import { ClipboardList, Eye, History, Printer } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'

function statusClass(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700'
  if (status === 'received') return 'bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500'
  return 'bg-amber-50 text-amber-800'
}

function OrderActions({ row, onView, onHistory, onPrint }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer"
        onClick={() => onView?.(row)}
      >
        <Eye className="size-3.5" />
        Details
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer"
        onClick={() => onHistory?.(row)}
      >
        <History className="size-3.5" />
        History
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer"
        onClick={() => onPrint?.(row)}
      >
        <Printer className="size-3.5" />
        PDF
      </Button>
    </div>
  )
}

// Purchase order list — mobile cards + desktop table
export function OrderTable({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
  onHistory,
  onPrint,
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = Math.max(1, pagination?.pageCount || 1)
  const total = pagination?.total ?? list.length
  const pageSize = pagination?.limit || 8

  return (
    <SurfaceCard
      className={className}
      title="Purchase orders"
      description="Orders placed with suppliers"
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={ClipboardList}
          title="No purchase orders yet"
          description="Generate an order after you have suppliers and products."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-slate-700">
                      {row.orderNumber || row.id?.slice(0, 8)}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                      {row.companyName}
                    </p>
                    {row.representativeName ? (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {row.representativeName}
                        {row.representativePhone ? ` · ${row.representativePhone}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass(row.status)}`}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{row.itemsNumber} items</p>
                <div className="mt-3">
                  <OrderActions
                    row={row}
                    onView={onView}
                    onHistory={onHistory}
                    onPrint={onPrint}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[640px] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs uppercase tracking-wide text-slate-400">
                  <TableHead className="px-2 py-3 font-semibold">Order id</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Company</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Items</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Status</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/80">
                    <TableCell className="px-2 py-3 font-mono text-xs text-slate-700">
                      {row.orderNumber || row.id?.slice(0, 8)}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <span className="font-medium text-slate-800">{row.companyName}</span>
                      {row.representativeName ? (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {row.representativeName}
                          {row.representativePhone ? ` · ${row.representativePhone}` : ''}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-600">{row.itemsNumber}</TableCell>
                    <TableCell className="px-2 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <OrderActions
                        row={row}
                        onView={onView}
                        onHistory={onHistory}
                        onPrint={onPrint}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isEmpty ? (
        <TablePagination
          page={page}
          pageCount={pageCount}
          totalItems={total}
          pageSize={pageSize}
          loading={loading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </SurfaceCard>
  )
}
