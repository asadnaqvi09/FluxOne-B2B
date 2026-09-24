import {
  MovementHistoryTable,
  movementImageNameColumns,
} from '@/components/feature/control/MovementHistoryTable'

export function StockInTable({
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
      label: 'Stock-in qty',
      render: (row) => (
        <span className="font-semibold text-emerald-700">+{Number(row.quantity || 0)}</span>
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
      title="Stock in history"
      description="Inbound ledger movements for this company"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={columns}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyTitle="No stock-in records"
      emptyHint="Add stock manually or receive an approved purchase order."
      className={className}
    />
  )
}
