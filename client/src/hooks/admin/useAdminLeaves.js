import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { fetchAdminBranchOptions } from '@/hooks/admin/useAdminBranches'

export function useAdminLeaves() {
  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)

  const loadBranches = useCallback(async () => {
    const res = await fetchAdminBranchOptions({ page: 1, limit: 100 })
    if (res.success) {
      const list = res.data?.items || res.data || []
      setBranches(Array.isArray(list) ? list : [])
    }
    return res
  }, [])

  const fetchLeaves = useCallback(async (branchId) => {
    setLoading(true)
    const res = await apiClient.get(endpoints.admin.leaves.list, {
      branchId: branchId || undefined,
    })
    setLoading(false)
    if (res.success) setItems(res.data || [])
    return res
  }, [])

  const decideLeave = useCallback(async (leaveId, body) => {
    return apiClient.patch(endpoints.admin.leaves.decide(leaveId), body)
  }, [])

  useEffect(() => {
    void loadBranches()
  }, [loadBranches])

  return {
    items,
    branches,
    loading,
    fetchLeaves,
    decideLeave,
    loadBranches,
  }
}
