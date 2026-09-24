import {
  MovementHistoryTable,
  movementImageNameColumns,
} from '@/components/feature/control/MovementHistoryTable'
import { DAMAGED_LOCATIONS } from '@/lib/mapStockMovement'

function locationLabel(value) {
  return DAMAGED_LOCATIONS.find((o) => o.value === value)?.label || value || '—'
}

export function DamagedTable({
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
      label: 'Damaged qty',
      render: (row) => (
        <span className="font-semibold text-amber-700">{Math.abs(Number(row.quantity || 0))}</span>
      ),
    },
    {
      key: 'by',
      label: 'Damaged by',
      render: (row) => <span className="text-slate-700">{row.damagedByName || '—'}</span>,
    },
    {
      key: 'where',
      label: 'Where',
      render: (row) => (
        <span className="text-slate-700">{locationLabel(row.damagedLocation)}</span>
      ),
    },
  ]

  return (
    <MovementHistoryTable
      title="Damaged items"
      description="Losses with employee and location"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={columns}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyTitle="No damaged records"
      emptyHint="Log damage with employee, location, and reason."
      className={className}
    />
  )
}
