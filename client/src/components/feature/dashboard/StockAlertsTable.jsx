import { memo } from 'react'
import { Bell } from 'lucide-react'
import { StockLegend } from '@/components/feature/dashboard/StockLegend'
import { StockStatusDot } from '@/components/feature/dashboard/StockStatusDot'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
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
import { sourceLabel, STOCK_STATUS_META } from '@/lib/mapInventoryDashboard'
import { cn } from '@/lib/utils'

function shortId(id) {
  if (!id) return '—'
  const text = String(id)
  if (text.length <= 10) return text
  return `${text.slice(0, 8)}…`
}

function StatusBadge({ status }) {
  const meta = STOCK_STATUS_META[status] || STOCK_STATUS_META.green
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        meta.bg,
        meta.text,
        meta.ring,
      )}
    >
      <StockStatusDot status={status} size="sm" className="ring-0" />
      {meta.label}
    </span>
  )
}

function StockAlertsTableComponent({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = Math.max(1, pagination?.pageCount || 1)
  const total = pagination?.total ?? list.length

  return (
    <SurfaceCard
      className={cn(
        'cursor-pointer transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(65,34,131,0.1)]',
        className,
      )}
      title="Stock Alerts & Requests"
      description="Low stock, branch alerts, and replenishment requests"
      actions={
        <span className="text-xs font-medium text-slate-400">
          {total} records · 8 / page
        </span>
      }
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={Bell}
          title="No alerts right now"
          description="Stock levels look healthy. Branch requests will appear here when managers raise them."
          compact
        />
      ) : (
        <>
          <div className="space-y-3 overflow-hidden md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="cursor-pointer rounded-xl border border-border bg-slate-50/60 px-3 py-3 transition-colors hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{shortId(row.id)}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">
                    Remaining{' '}
                    <span className="font-bold text-slate-900">{row.remainingNumber}</span>
                  </span>
                  <span className="truncate text-slate-500">{sourceLabel(row.source)}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden md:block">
            <Table className="w-full table-fixed text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                  <TableHead className="w-[18%] px-2 py-3 font-semibold">Id</TableHead>
                  <TableHead className="w-[28%] px-2 py-3 font-semibold">Name</TableHead>
                  <TableHead className="w-[14%] px-2 py-3 font-semibold">Remaining</TableHead>
                  <TableHead className="w-[18%] px-2 py-3 font-semibold">Status</TableHead>
                  <TableHead className="w-[22%] px-2 py-3 font-semibold">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-slate-50/80"
                  >
                    <TableCell
                      className="truncate px-2 py-3 font-mono text-xs text-slate-500"
                      title={String(row.id)}
                    >
                      {shortId(row.id)}
                    </TableCell>
                    <TableCell className="truncate px-2 py-3 font-medium text-slate-900" title={row.name}>
                      {row.name}
                    </TableCell>
                    <TableCell className="px-2 py-3 tabular-nums text-slate-800">{row.remainingNumber}</TableCell>
                    <TableCell className="px-2 py-3">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="truncate px-2 py-3 text-slate-600" title={sourceLabel(row.source)}>
                      {sourceLabel(row.source)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            loading={loading}
            onPageChange={onPageChange}
          />

          <div className="mt-4 border-t border-border pt-3">
            <StockLegend />
          </div>
        </>
      )}
    </SurfaceCard>
  )
}

export const StockAlertsTable = memo(StockAlertsTableComponent)
