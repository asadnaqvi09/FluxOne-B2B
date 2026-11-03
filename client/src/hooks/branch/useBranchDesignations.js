import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export function useBranchDesignations({ active = 'active', limit = 100 } = {}) {
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.branch.designations.list, { active, limit })
    setLoading(false)
    if (res.success && res.data) {
      setDesignations(res.data.items || res.data || [])
    }
    return res
  }, [active, limit])

  useEffect(() => {
    void reload()
  }, [reload])

  return { designations, loading, reload }
}
