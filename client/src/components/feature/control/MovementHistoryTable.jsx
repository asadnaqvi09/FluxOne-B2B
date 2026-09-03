import { Package, Pencil, Trash2 } from 'lucide-react'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
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
import { formatMovementDateTime } from '@/lib/mapStockMovement'
import { displayMovementRef } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

/**
 * Shared ledger history table shell.
 * @param {{ columns: Array<{ key: string, label: string, className?: string, render: (row) => import('react').ReactNode }> }} props
 */
export function MovementHistoryTable({
  title,
  description,
  items = [],
  loading = false,
  pagination,
  columns = [],
  onPageChange,
  onEdit,
  onDelete,
  emptyTitle = 'No movements yet',
  emptyHint = 'Add a movement or adjust filters.',
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = Math.max(1, pagination?.pageCount || 1)
  const total = pagination?.total ?? list.length
  const showActions = Boolean(onEdit || onDelete)

  return (
    <SurfaceCard
      className={className}
      title={title}
      description={description}
      actions={
        <span className="text-xs font-medium text-slate-400">
          {total} record{total === 1 ? '' : 's'} · 8 / page
        </span>
      }
    >
      {loading ? (
        <TableRowsSkeleton rows={6} />
      ) : isEmpty ? (
        <EmptyState icon={Package} title={emptyTitle} description={emptyHint} />
      ) : (
        <>
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <Table className="min-w-[640px] text-left text-sm md:min-w-[720px]">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-400 uppercase">
                  {columns.map((col) => (
                    <TableHead key={col.key} className={cn('px-2 py-2 font-semibold', col.className)}>
                      {col.label}
                    </TableHead>
                  ))}
                  {showActions ? (
                    <TableHead className="px-2 py-2 text-right font-semibold">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/80">
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn('px-2 py-3 align-middle', col.className)}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                    {showActions ? (
                      <TableCell className="px-2 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {onEdit ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => onEdit(row)}
                              title="Edit"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          {onDelete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-red-600 hover:text-red-700"
                              onClick={() => onDelete(row)}
                              title="Delete"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
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
        </>
      )}
    </SurfaceCard>
  )
}

export function movementImageNameColumns() {
  return [
    {
      key: 'reference',
      label: 'Reference',
      className: 'w-28',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600" title={row.id}>
          {displayMovementRef(row)}
        </span>
      ),
    },
    {
      key: 'image',
      label: 'Image',
      className: 'w-14',
      render: (row) => <ProductImageCell src={row.imageUrl} name={row.productName} />,
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{row.productName || '—'}</p>
          {row.itemCode ? (
            <p className="text-xs text-slate-400">{row.itemCode}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'when',
      label: 'Date · Time',
      className: 'whitespace-nowrap',
      render: (row) => (
        <span className="text-slate-600">{formatMovementDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'scale',
      label: 'Scale',
      render: (row) => <span className="capitalize text-slate-700">{row.scale || '—'}</span>,
    },
  ]
}
