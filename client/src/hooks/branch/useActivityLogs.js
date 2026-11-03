import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export const ACTIVITY_LOGS_PAGE_SIZE = 8

const EMPTY_FILTERS = {
  page: 1,
  limit: ACTIVITY_LOGS_PAGE_SIZE,
  from: '',
  to: '',
  source: '',
  action: '',
  q: '',
}

function normalizeFilters(patch = {}) {
  return {
    ...EMPTY_FILTERS,
    ...patch,
    page: Math.max(1, Number(patch.page) || 1),
    limit: Math.min(200, Math.max(1, Number(patch.limit) || ACTIVITY_LOGS_PAGE_SIZE)),
  }
}

function toApiParams(filters) {
  const params = {
    page: filters.page,
    limit: filters.limit,
  }
  if (filters.from) params.from = new Date(`${filters.from}T00:00:00`).toISOString()
  if (filters.to) params.to = new Date(`${filters.to}T23:59:59.999`).toISOString()
  if (filters.source) params.source = filters.source
  if (filters.action) params.action = filters.action
  if (filters.q?.trim()) params.q = filters.q.trim()
  return params
}

export function useActivityLogs(initialFilters = {}) {
  const [filters, setFilters] = useState(() => normalizeFilters(initialFilters))
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ACTIVITY_LOGS_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchSeq = useRef(0)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchLogs = useCallback(async (nextFilters = filtersRef.current) => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setError(null)
    const res = await apiClient.get(endpoints.branch.activityLogs.list, toApiParams(nextFilters))
    if (seq !== fetchSeq.current) return

    setLoading(false)
    if (!res.success) {
      setItems([])
      setError(res.error || 'Failed to load activity logs')
      setPagination({
        page: nextFilters.page,
        limit: nextFilters.limit,
        total: 0,
        pageCount: 1,
      })
      return
    }

    const data = res.data || {}
    const rows = data.items || []
    const meta = data.pagination || {
      page: nextFilters.page,
      limit: nextFilters.limit,
      total: rows.length,
      pageCount: 1,
    }
    setItems(rows)
    setPagination(meta)
  }, [])

  useEffect(() => {
    void fetchLogs(filters)
  }, [filters, fetchLogs])

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => {
      const next = normalizeFilters({ ...prev, ...patch })
      const pageResetKeys = ['from', 'to', 'source', 'action', 'q', 'limit']
      const shouldResetPage = pageResetKeys.some(
        (key) => patch[key] !== undefined && patch[key] !== prev[key],
      )
      if (shouldResetPage && patch.page === undefined) next.page = 1
      return next
    })
  }, [])

  return {
    items,
    pagination,
    filters,
    loading,
    error,
    updateFilters,
    setPage: (page) => updateFilters({ page }),
    reload: () => fetchLogs(filtersRef.current),
  }
}
