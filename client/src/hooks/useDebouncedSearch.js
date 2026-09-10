import { useEffect, useRef, useState } from 'react'

// Local search box state + debounced filter patch.
// Typing updates the input immediately; `updateFilters({ q })` fires after debounce.
export function useDebouncedSearch(updateFilters, initialQ = '', delayMs = 300) {
  const [localQ, setLocalQ] = useState(initialQ)
  const timerRef = useRef(null)
  const updateRef = useRef(updateFilters)
  updateRef.current = updateFilters

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function onSearchChange(q) {
    setLocalQ(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      updateRef.current?.({ q })
    }, delayMs)
  }

  return { localQ, setLocalQ, onSearchChange }
}
