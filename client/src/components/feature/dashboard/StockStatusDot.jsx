import { STOCK_STATUS_META } from '@/lib/inventory/mapInventoryDashboard'
import { cn } from '@/lib/utils'

export function StockStatusDot({ status = 'green', size = 'md', className }) {
  const meta = STOCK_STATUS_META[status] || STOCK_STATUS_META.green
  const dim = size === 'sm' ? 'size-2.5' : 'size-3'

  return (
    <span
      className={cn('inline-block shrink-0 rounded-full ring-2 ring-white', dim, className)}
      style={{ background: meta.color }}
      title={meta.label}
      aria-label={meta.label}
    />
  )
}
