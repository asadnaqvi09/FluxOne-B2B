import { useEffect, useState } from 'react'

/**
 * Debounce a value — input stays instant; consumers react after `delayMs`.
 * Used for real-time search without hammering the API on every keystroke.
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
