import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { SCALE_OPTIONS } from '@/lib/mapProduct'

/**
 * Loads tenant item scales from Resources API.
 * Falls back to SCALE_OPTIONS when the API is empty/unavailable so product forms still work.
 */
export function useItemScales({ enabled = true } = {}) {
  const [scales, setScales] = useState(SCALE_OPTIONS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(endpoints.branch.resources.scales.list)
      if (res.success) {
        const names = (res.data || [])
          .map((row) => String(row.name || '').trim())
          .filter(Boolean)
        const unique = [...new Set(names)]
        setScales(unique.length > 0 ? unique : SCALE_OPTIONS)
      } else {
        setError(res.error || 'Failed to load scales')
        setScales(SCALE_OPTIONS)
      }
    } catch (err) {
      setError(err?.message || 'Failed to load scales')
      setScales(SCALE_OPTIONS)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { scales, loading, error, refresh }
}

export default useItemScales
