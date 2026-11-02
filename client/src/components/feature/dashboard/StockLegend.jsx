import { STOCK_STATUS_META } from '@/lib/inventory/mapInventoryDashboard'
import { cn } from '@/lib/utils'

const ORDER = ['red', 'yellow', 'green']

export function StockLegend({ className, compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        compact ? 'sm:flex-row sm:flex-wrap sm:items-center sm:gap-4' : '',
        className,
      )}
    >
      {ORDER.map((key) => {
        const meta = STOCK_STATUS_META[key]
        return (
          <div key={key} className="flex items-start gap-2 text-xs text-slate-600 sm:items-center">
            <span
              className="mt-0.5 size-2.5 shrink-0 rounded-full sm:mt-0"
              style={{ background: meta.color }}
            />
            <span>
              <span className="font-semibold text-slate-800">{meta.label}</span>
              {!compact ? (
                <span className="text-slate-500"> — {meta.hint}</span>
              ) : (
                <span className="hidden text-slate-500 sm:inline"> · {meta.hint}</span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
