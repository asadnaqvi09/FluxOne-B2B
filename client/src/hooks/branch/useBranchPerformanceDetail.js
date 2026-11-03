import { useCallback, useState } from 'react'
import { apiClient } from '@/api/api'

export function useBranchPerformanceDetail() {
  const [detail, setDetail] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(false)

  const loadEmployeeDetail = useCallback(async (staffId, query = {}) => {
    if (!staffId) return { success: false, error: 'Missing staff id' }
    setLoading(true)
    const res = await apiClient.get(`/branch/performance/employees/${staffId}`, query)
    setLoading(false)
    if (res.success) {
      setDetail(res.data)
    } else {
      setDetail(null)
    }
    return res
  }, [])

  const loadScales = useCallback(async () => {
    const res = await apiClient.get('/branch/performance/scales')
    if (res.success) {
      setCriteria(res.data?.criteria || [])
    }
    return res
  }, [])

  return {
    detail,
    setDetail,
    criteria,
    loading,
    loadEmployeeDetail,
    loadScales,
  }
}
