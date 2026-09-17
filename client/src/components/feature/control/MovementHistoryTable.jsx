import { Package } from 'lucide-react'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
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

function MovementRowActions({ row, onEdit, onDelete }) {
  return (
    <RowActionButtons
      onEdit={onEdit ? () => onEdit(row) : undefined}
      onDelete={onDelete ? () => onDelete(row) : undefined}
    />
  )
}

// Shared ledger history — mobile cards + desktop table
export function MovementHistoryTable({
  title,
  description,
  items = [],
  loading = false,
  pagination,
  columns = [],
  onPageChange,
  onPageSizeChange,
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
  const pageSize = pagination?.limit || 8
  const showActions = Boolean(onEdit || onDelete)

  return (
    <SurfaceCard
      className={className}
      title={title}
      description={description}
    >
      {loading ? (
        <TableRowsSkeleton rows={6} />
      ) : isEmpty ? (
        <EmptyState icon={Package} title={emptyTitle} description={emptyHint} />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
              >
                <div className="space-y-2.5">
                  {columns.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                        {col.label}
                      </p>
                      <div className="mt-0.5 text-sm text-slate-800">{col.render(row)}</div>
                    </div>
                  ))}
                </div>
                {showActions ? (
                  <div className="mt-3 flex justify-end border-t border-border pt-2">
                    <MovementRowActions row={row} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block -mx-1 px-1 sm:mx-0 sm:px-0">
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
                        <MovementRowActions row={row} onEdit={onEdit} onDelete={onDelete} />
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
            pageSize={pageSize}
            loading={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
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
