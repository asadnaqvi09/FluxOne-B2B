import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * Auto-dismissible welcome strip across all accounts (Admin, Branch Manager, etc.)
 * - Appears every time after login / dashboard load
 * - Automatically disappears after 10 seconds
 * - Can be manually dismissed anytime via the 'X' icon
 */
export function WelcomeBanner({
  eyebrow,
  title,
  description,
  className,
  enabled = true,
  autoDismissSeconds = 10,
  onDismiss,
}) {
  const [visible, setVisible] = useState(Boolean(enabled))

  useEffect(() => {
    setVisible(Boolean(enabled))
  }, [enabled])

  const dismiss = useCallback(() => {
    setVisible(false)
    onDismiss?.()
  }, [onDismiss])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!visible || !autoDismissSeconds || autoDismissSeconds <= 0) return undefined
    const timer = setTimeout(() => {
      dismiss()
    }, autoDismissSeconds * 1000)

    return () => clearTimeout(timer)
  }, [visible, autoDismissSeconds, dismiss])

  if (!enabled) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: -8,
            height: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
            overflow: 'hidden',
          }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
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
              aria-label="Dismiss welcome banner"
              onClick={dismiss}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default WelcomeBanner
