import {
  MovementHistoryTable,
  movementImageNameColumns,
} from '@/components/feature/control/MovementHistoryTable'

const SOURCE_LABEL = {
  out: 'Sale / stock out',
  damaged: 'Damaged',
  expired: 'Expired',
}

export function StockOutTable({
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
      key: 'source',
      label: 'Source',
      render: (row) => (
        <span className="text-slate-600">
          {SOURCE_LABEL[row.movementType] || row.movementType || '—'}
        </span>
      ),
    },
    {
      key: 'qty',
      label: 'Stock-out qty',
      render: (row) => (
        <span className="font-semibold text-red-600">−{Math.abs(Number(row.quantity || 0))}</span>
      ),
    },
  ]

  return (
    <MovementHistoryTable
      title="Stock out history"
      description="Inventory leaving stock via sales, damaged, or expired"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={columns}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyTitle="No stock-out records"
      emptyHint="Damaged, expired, and POS sales appear here automatically."
      className={className}
    />
  )
}
