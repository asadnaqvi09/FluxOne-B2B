import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

const DEFAULT_PAGE_SIZE = 50

/**
 * Live B2B Admin branches (`/api/admin/branches`).
 * Password is auto-generated on create / reset-password (email + stub log).
 */
export function useAdminBranches({ q = '', status = 'all', page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pageCount: 1 })
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = {
      q: q?.trim() || undefined,
      status: status && status !== 'all' ? status : undefined,
      page,
      limit,
    }
    const result = await apiClient.get(endpoints.admin.branches.list, params)
    if (!result.success) {
      setItems([])
      setPagination({ page: 1, limit, total: 0, pageCount: 1 })
      setError(result.error || 'Failed to load branches')
      setLoading(false)
      return
    }
    setItems(result.data?.items || [])
    setPagination(
      result.data?.pagination || {
        page,
        limit,
        total: result.data?.items?.length || 0,
        pageCount: 1,
      },
    )
    setLoading(false)
  }, [q, status, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  const createBranch = useCallback(
    async (fields) => {
      setMutating(true)
      const result = await apiClient.post(endpoints.admin.branches.create, fields)
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const updateBranch = useCallback(
    async (id, fields) => {
      setMutating(true)
      const result = await apiClient.patch(endpoints.admin.branches.update(id), fields)
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const setBranchStatus = useCallback(
    async (id, nextStatus) => {
      setMutating(true)
      const result = await apiClient.patch(endpoints.admin.branches.status(id), {
        status: nextStatus,
      })
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const resetManagerPassword = useCallback(
    async (id) => {
      setMutating(true)
      const result = await apiClient.post(endpoints.admin.branches.resetPassword(id), {})
      setMutating(false)
      return result
    },
    [],
  )

  return {
    items,
    pagination,
    loading,
    mutating,
    error,
    reload: load,
    createBranch,
    updateBranch,
    setBranchStatus,
    resetManagerPassword,
  }
}

export { DEFAULT_PAGE_SIZE as ADMIN_BRANCHES_PAGE_SIZE }
