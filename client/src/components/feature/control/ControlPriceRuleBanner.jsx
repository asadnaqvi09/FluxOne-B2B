import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const AUTO_DISMISS_MS = 4000

// Price utilization notice — dismissible + auto-hide after a few seconds.
export function ControlPriceRuleBanner({ active = false, className }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return undefined
    }
    // Show on activate; avoid sync setState lint by deferring one tick.
    let cancelled = false
    const showTimer = window.setTimeout(() => {
      if (!cancelled) setVisible(true)
    }, 0)
    const hideTimer = window.setTimeout(() => {
      if (!cancelled) setVisible(false)
    }, AUTO_DISMISS_MS)
    return () => {
      cancelled = true
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [active])

  if (!active || !visible) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-900',
        className,
      )}
      role="status"
    >
      <p className="min-w-0 flex-1 leading-relaxed">
        Price rule on: new purchase/selling prices apply only after previous stock is fully
        utilized (on-hand must be 0).
      </p>
      <button
        type="button"
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-amber-800/70 hover:bg-amber-100 hover:text-amber-950"
        aria-label="Dismiss price rule notice"
        onClick={() => setVisible(false)}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export default ControlPriceRuleBanner
