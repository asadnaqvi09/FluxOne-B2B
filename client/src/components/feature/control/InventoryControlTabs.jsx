import {
  ArrowDownToLine,
  ArrowUpFromLine,
  MoreHorizontal,
  PackageX,
  Scale,
  TimerOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export const CONTROL_TABS = [
  { id: MOVEMENT_TYPES.IN, label: 'Stock In', icon: ArrowDownToLine },
  { id: MOVEMENT_TYPES.OUT, label: 'Stock Out', icon: ArrowUpFromLine },
  { id: MOVEMENT_TYPES.ADJUSTMENT, label: 'Adjustment', icon: Scale },
  { id: MOVEMENT_TYPES.DAMAGED, label: 'Damaged', icon: PackageX },
  { id: MOVEMENT_TYPES.EXPIRED, label: 'Expired', icon: TimerOff },
  { id: MOVEMENT_TYPES.OTHER, label: 'Others', icon: MoreHorizontal },
]

// Control tabs — count badges from summary API (Phase 2).
export function InventoryControlTabs({
  value,
  onChange,
  counts = null,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 border-b border-slate-200 pb-px',
        className,
      )}
      role="tablist"
    >
      {CONTROL_TABS.map((tab) => {
        const active = value === tab.id
        const count = counts?.[tab.id]
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              'relative inline-flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-4',
              active
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            <span>{tab.label}</span>
            {count != null ? (
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                  active
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-600',
                )}
              >
                {Number(count).toLocaleString()}
              </span>
            ) : null}
            {active ? (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                style={{ background: BRAND.purple }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
