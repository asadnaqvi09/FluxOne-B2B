import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Shows a cold-start hint after `delayMs` while `active` is true.
// Useful on Render free tier (15–30s first request).
export function useSlowLoadingHint(active, delayMs = 3000) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!active) {
      setShow(false)
      return
    }
    const timer = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs])

  return show
}

export function SlowLoadingBanner({ show, className, message }) {
  if (!show) return null
  return (
    <p
      role="status"
      className={cn(
        'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900',
        className,
      )}
    >
      {message ||
        'Still loading… free hosting can take 15–30 seconds on the first API call while the server wakes up.'}
    </p>
  )
}
