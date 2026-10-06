import { ArrowRight } from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { TagIcon as TagIconOutline } from 'lucide-react'

// Daily price banner — only when products with dailyPriceChange still need today's update
export function ControlDailyPriceBanner({
  pendingCount = 0,
  onReview,
  className,
}) {
  const count = Number(pendingCount) || 0
  if (count <= 0) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-amber-950 flex items-center gap-2">
        <TagIconOutline className="size-4" />
        <span className="font-semibold tracking-wide">A fresh day, a fresh price.</span>{' '}
        {count} item{count === 1 ? '' : 's'} require daily price updates. Keep your prices up
        to date.
      </p>
      <button
        type="button"
        onClick={() => onReview?.()}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold hover:underline"
        style={{ color: BRAND.purple }}
      >
        Review prices
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}

export default ControlDailyPriceBanner
