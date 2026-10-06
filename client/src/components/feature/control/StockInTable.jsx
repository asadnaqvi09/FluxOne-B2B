import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { MovementRowMenu } from '@/components/feature/control/MovementRowMenu'
import { controlColumnsForTab } from '@/lib/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export function StockInTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onUpdateStock,
  onUpdateThreshold,
  onUpdatePrice,
  onViewDetails,
  className,
}) {
  return (
    <MovementHistoryTable
      title="Stock in history"
      description="Inbound ledger movements for this company"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.IN)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      renderRowActions={(row) => (
        <MovementRowMenu
          row={row}
          tab={MOVEMENT_TYPES.IN}
          onUpdateStock={onUpdateStock}
          onUpdateThreshold={onUpdateThreshold}
          onUpdatePrice={onUpdatePrice}
          onViewDetails={onViewDetails}
        />
      )}
      emptyTitle="No stock-in records"
      emptyHint="Add stock manually or receive an approved purchase order."
      className={className}
    />
  )
}
