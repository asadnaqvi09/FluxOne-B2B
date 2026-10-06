import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { MovementRowMenu } from '@/components/feature/control/MovementRowMenu'
import { controlColumnsForTab } from '@/lib/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export function AdjustmentTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onUpdateThreshold,
  onUpdatePrice,
  onViewDetails,
  onEdit,
  onDelete,
  className,
}) {
  return (
    <MovementHistoryTable
      title="Adjustment history"
      description="Manual quantity corrections"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.ADJUSTMENT)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      renderRowActions={(row) => (
        <MovementRowMenu
          row={row}
          tab={MOVEMENT_TYPES.ADJUSTMENT}
          onUpdateThreshold={onUpdateThreshold}
          onUpdatePrice={onUpdatePrice}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      emptyTitle="No adjustments"
      emptyHint="Create an adjustment with a required reason."
      className={className}
    />
  )
}
