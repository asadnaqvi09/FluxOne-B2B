import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

const DEFAULT_PAGE_SIZE = 100

function policyPayload(fields = {}, { partial = false } = {}) {
  const body = {}
  if (!partial || fields.name !== undefined) {
    body.name = String(fields.name || '').trim()
  }
  if (!partial || fields.detail !== undefined) {
    body.detail = String(fields.detail || '').trim()
  }
  if (fields.category !== undefined) {
    body.category = fields.category?.trim() || undefined
  }
  if (fields.printOnSlip !== undefined) {
    body.printOnSlip = Boolean(fields.printOnSlip)
  }
  if (fields.isActive !== undefined) {
    body.isActive = Boolean(fields.isActive)
  }
  return body
}

// Live B2B Admin policies handbook (/api/admin/policies).
export function useAdminPolicies({ q = '', category = 'all', page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  })
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiClient.get(endpoints.admin.policies.list, {
      q: q?.trim() || undefined,
      category: category && category !== 'all' ? category : undefined,
      page,
      limit,
    })
    if (!result.success) {
      setItems([])
      setPagination({ page: 1, limit, total: 0, pageCount: 1 })
      setError(result.error || 'Failed to load policies')
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
  }, [q, category, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  const createPolicy = useCallback(
    async (fields) => {
      setMutating(true)
      const result = await apiClient.post(endpoints.admin.policies.create, policyPayload(fields))
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const updatePolicy = useCallback(
    async (id, fields) => {
      setMutating(true)
      const result = await apiClient.patch(
        endpoints.admin.policies.update(id),
        policyPayload(fields, { partial: true }),
      )
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  // Quick patch for Print on Slip toggle without rewriting name/detail
  const setPrintOnSlip = useCallback(
    async (id, printOnSlip) => {
      setMutating(true)
      const result = await apiClient.patch(endpoints.admin.policies.update(id), {
        printOnSlip: Boolean(printOnSlip),
      })
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const deletePolicy = useCallback(
    async (id) => {
      setMutating(true)
      const result = await apiClient.delete(endpoints.admin.policies.remove(id))
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  return {
    items,
    pagination,
    loading,
    mutating,
    error,
    reload: load,
    createPolicy,
    updatePolicy,
    setPrintOnSlip,
    deletePolicy,
  }
}

export { DEFAULT_PAGE_SIZE as ADMIN_POLICIES_PAGE_SIZE }
