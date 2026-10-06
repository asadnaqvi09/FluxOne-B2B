import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { cn } from '@/lib/utils'

// Row ⋯ menu — tab-aware actions for Control history tables
export function MovementRowMenu({
  row,
  tab,
  onUpdateStock,
  onUpdateThreshold,
  onUpdatePrice,
  onViewDetails,
  onEdit,
  onDelete,
  className,
}) {
  const canUpdateStock = tab === MOVEMENT_TYPES.IN && Boolean(onUpdateStock)
  const canEditRecord =
    (tab === MOVEMENT_TYPES.ADJUSTMENT ||
      tab === MOVEMENT_TYPES.DAMAGED ||
      tab === MOVEMENT_TYPES.OTHER) &&
    Boolean(onEdit)
  const canDeleteRecord =
    (tab === MOVEMENT_TYPES.ADJUSTMENT ||
      tab === MOVEMENT_TYPES.DAMAGED ||
      tab === MOVEMENT_TYPES.OTHER) &&
    Boolean(onDelete)

  return (
    <div className={cn('relative inline-flex', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <MoreVertical className="size-4" />
          <span className="sr-only">Row actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {canUpdateStock ? (
            <DropdownMenuItem onClick={() => onUpdateStock?.(row)}>
              Update stock
            </DropdownMenuItem>
          ) : null}
          {onUpdateThreshold ? (
            <DropdownMenuItem onClick={() => onUpdateThreshold?.(row)}>
              Update threshold
            </DropdownMenuItem>
          ) : null}
          {onUpdatePrice ? (
            <DropdownMenuItem onClick={() => onUpdatePrice?.(row)}>
              Update price
            </DropdownMenuItem>
          ) : null}
          {onViewDetails ? (
            <DropdownMenuItem onClick={() => onViewDetails?.(row)}>
              View details & history
            </DropdownMenuItem>
          ) : null}
          {canEditRecord || canDeleteRecord ? <DropdownMenuSeparator /> : null}
          {canEditRecord ? (
            <DropdownMenuItem onClick={() => onEdit?.(row)}>Edit record</DropdownMenuItem>
          ) : null}
          {canDeleteRecord ? (
            <DropdownMenuItem
              className="text-red-600 hover:bg-red-50"
              onClick={() => onDelete?.(row)}
            >
              Delete record
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default MovementRowMenu
