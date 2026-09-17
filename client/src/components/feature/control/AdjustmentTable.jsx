import {
  MovementHistoryTable,
  movementImageNameColumns,
} from '@/components/feature/control/MovementHistoryTable'

export function AdjustmentTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  className,
}) {
  const columns = [
    ...movementImageNameColumns(),
    {
      key: 'qty',
      label: 'Adjustment qty',
      render: (row) => {
        const q = Number(row.quantity || 0)
        return (
          <span className={q >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
            {q >= 0 ? `+${q}` : q}
          </span>
        )
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => <span className="line-clamp-2 text-slate-600">{row.reason || '—'}</span>,
    },
  ]

  return (
    <MovementHistoryTable
      title="Adjustment history"
      description="Manual quantity corrections"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={columns}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyTitle="No adjustments"
      emptyHint="Create an adjustment with a required reason."
      className={className}
    />
  )
}
