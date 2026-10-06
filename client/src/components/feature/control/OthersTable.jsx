import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { MovementRowMenu } from '@/components/feature/control/MovementRowMenu'
import { controlColumnsForTab } from '@/lib/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export function OthersTable({
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
      title="Others history"
      description="Miscellaneous stock movements with a required reason"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.OTHER)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      renderRowActions={(row) => (
        <MovementRowMenu
          row={row}
          tab={MOVEMENT_TYPES.OTHER}
          onUpdateThreshold={onUpdateThreshold}
          onUpdatePrice={onUpdatePrice}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      emptyTitle="No other movements"
      emptyHint="Add an other movement with a required reason."
      className={className}
    />
  )
}
