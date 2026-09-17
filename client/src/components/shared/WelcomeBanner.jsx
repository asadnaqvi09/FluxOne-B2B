import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

function welcomeStorageKey(scope, user, token) {
  const who = user?.id || user?.email || user?.username || 'anon'
  const session = token ? String(token).slice(-12) : 'nosession'
  return `fluxone:welcome-banner:${scope}:${who}:${session}`
}

function readDismissed(key) {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeDismissed(key) {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Welcome strip for all account dashboards.
 * - Shows once per login session (sessionStorage; survives tab changes, resets on new login)
 * - Auto-dismisses after 10s
 * - Manual dismiss via X
 * Remount via `key={storageKey}` from wrappers when the login session changes.
 */
export function WelcomeBanner({
  eyebrow,
  title,
  description,
  className,
  enabled = true,
  autoDismissSeconds = 10,
  scope = 'default',
  onDismiss,
}) {
  const { user, token } = useAuthSession()
  const storageKey = welcomeStorageKey(scope, user, token)

  const [visible, setVisible] = useState(
    () => Boolean(enabled) && !readDismissed(storageKey),
  )

  const dismiss = useCallback(() => {
    setVisible(false)
    writeDismissed(storageKey)
    onDismiss?.()
  }, [onDismiss, storageKey])

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
      {visible ? (
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
          role="status"
          aria-live="polite"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
          />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 pr-2">
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
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default WelcomeBanner
