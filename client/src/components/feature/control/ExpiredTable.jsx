import {
  MovementHistoryTable,
  movementImageNameColumns,
} from '@/components/feature/control/MovementHistoryTable'
import { formatMovementDateTime } from '@/lib/mapStockMovement'

export function ExpiredTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  className,
}) {
  const columns = [
    ...movementImageNameColumns(),
    {
      key: 'type',
      label: 'Type',
      render: (row) => <span className="capitalize text-slate-700">{row.type || '—'}</span>,
    },
    {
      key: 'qty',
      label: 'Expired qty',
      render: (row) => (
        <span className="font-semibold text-red-600">{Math.abs(Number(row.quantity || 0))}</span>
      ),
    },
    {
      key: 'expires',
      label: 'Expires',
      render: (row) => (
        <span className="text-slate-600">
          {row.expiresAt ? formatMovementDateTime(row.expiresAt).split(',')[0] : '—'}
        </span>
      ),
    },
    {
      key: 'company',
      label: 'Company Name',
      render: (row) => <span className="text-slate-700">{row.companyName || '—'}</span>,
    },
  ]

  return (
    <MovementHistoryTable
      title="Expired products"
      description="Lots past expiry — processed automatically from stock-in"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={columns}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyTitle="No expired records"
      emptyHint="When stock-in lots pass their expiry date, they appear here automatically."
      className={className}
    />
  )
}
