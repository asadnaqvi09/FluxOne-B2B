import { useCallback, useEffect, useRef } from 'react'

function serializeFormValue(value) {
  if (value instanceof File) {
    return `__file:${value.name}:${value.size}:${value.type}`
  }
  if (Array.isArray(value)) {
    return value.map(serializeFormValue)
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = serializeFormValue(value[key])
        return acc
      }, {})
  }
  return value
}

function serializeSnapshot(snapshot) {
  return JSON.stringify(serializeFormValue(snapshot))
}

// Capture an initial snapshot when a modal opens and compare against live form state.
export function useFormBaseline(open) {
  const baselineRef = useRef(null)

  useEffect(() => {
    if (!open) baselineRef.current = null
  }, [open])

  const captureBaseline = useCallback((snapshot) => {
    baselineRef.current = serializeSnapshot(snapshot)
  }, [])

  const isDirty = useCallback(
    (current) => {
      if (!open || baselineRef.current == null) return false
      return serializeSnapshot(current) !== baselineRef.current
    },
    [open],
  )

  return { captureBaseline, isDirty }
}
