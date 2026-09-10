import { Package } from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Shared empty list placeholder
export function EmptyState({
  icon: Icon = Package,
  title = 'Nothing here yet',
  description,
  className,
  compact = false,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-slate-50/80 text-center',
        compact ? 'px-4 py-10' : 'px-4 py-14',
        className,
      )}
    >
      <div
        className="flex size-12 items-center justify-center rounded-full"
        style={{ background: 'rgba(142, 35, 143, 0.1)', color: BRAND.purple }}
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  )
}
