import { useState } from 'react'
import { X } from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Dismissible welcome strip — storageKey controls once-per-browser dismiss
export function WelcomeBanner({
  storageKey,
  eyebrow,
  title,
  description,
  className,
  enabled = true,
}) {
  // Bump after dismiss so localStorage re-read hides the banner
  const [, setDismissVersion] = useState(0)

  const isSeen =
    !storageKey ||
    (typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1')

  if (!enabled || isSeen) return null

  function dismiss() {
    if (storageKey) localStorage.setItem(storageKey, '1')
    setDismissVersion((version) => version + 1)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss welcome"
          onClick={dismiss}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default WelcomeBanner
