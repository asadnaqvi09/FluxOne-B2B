import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export const CONTROL_TABS = [
  { id: MOVEMENT_TYPES.IN, label: 'Stock In' },
  { id: MOVEMENT_TYPES.OUT, label: 'Stock Out' },
  { id: MOVEMENT_TYPES.ADJUSTMENT, label: 'Adjustment' },
  { id: MOVEMENT_TYPES.DAMAGED, label: 'Damaged' },
  { id: MOVEMENT_TYPES.EXPIRED, label: 'Expired' },
]

// Phase-1 Control tabs (Transfer deferred).
export function InventoryControlTabs({ value, onChange, className }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {CONTROL_TABS.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange?.(tab.id)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-[0.97] sm:px-4 sm:py-2 sm:text-sm',
              active
                ? 'border-transparent text-white shadow-sm'
                : 'border-border bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            )}
            style={active ? { background: BRAND.purple } : undefined}
          >
            {tab.label}
          </button>
        )
      })}
      <span
        className="inline-flex items-center rounded-full border border-dashed border-border px-3 py-1.5 text-[11px] font-medium text-slate-400 sm:px-4 sm:py-2 sm:text-xs"
        title="Stock Transfer UI ships in Phase 2"
      >
        Transfer · Phase 2
      </span>
    </div>
  )
}
