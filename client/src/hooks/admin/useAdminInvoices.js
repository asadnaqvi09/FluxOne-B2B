import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export const ADMIN_INVOICES_PAGE_SIZE = 8

const EMPTY_SUMMARY = {
  planName: null,
  branchLimit: null,
  branchCount: 0,
  autoPay: false,
  nextRenewalAt: null,
  paymentMethod: null,
  isActive: false,
  ytdTotal: 0,
  ytdFormatted: 'Rs. 0',
  ytdCount: 0,
  totalCount: 0,
}

// Live B2B Admin SaaS billing invoices (/api/admin/invoices).
export function useAdminInvoices({
  q = '',
  month = 'all',
  year = 'all',
  page = 1,
  limit = ADMIN_INVOICES_PAGE_SIZE,
} = {}) {
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    pageCount: 1,
  })
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    const result = await apiClient.get(endpoints.admin.invoices.summary)
    if (!result.success) {
      setSummary(EMPTY_SUMMARY)
      setSummaryLoading(false)
      return result
    }
    setSummary({ ...EMPTY_SUMMARY, ...(result.data || {}) })
    setSummaryLoading(false)
    return result
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiClient.get(endpoints.admin.invoices.list, {
      q: q?.trim() || undefined,
      month: month && month !== 'all' ? month : undefined,
      year: year && year !== 'all' ? year : undefined,
      page,
      limit,
    })
    if (!result.success) {
      setItems([])
      setPagination({ page: 1, limit, total: 0, pageCount: 1 })
      setError(result.error || 'Failed to load invoices')
      setLoading(false)
      return result
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
    return result
  }, [q, month, year, page, limit])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void load()
  }, [load])

  return {
    items,
    summary,
    pagination,
    loading,
    summaryLoading,
    error,
    reload: load,
    reloadSummary: loadSummary,
  }
}
