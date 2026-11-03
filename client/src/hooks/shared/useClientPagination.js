import { useMemo, useState } from 'react'
import { TABLE_PAGE_SIZE } from '@/lib/tablePagination'

/**
 * Client-side list paging: slice + page/pageSize state.
 * Page size changes reset to page 1 via setPageSize.
 */
export function useClientPagination(items = [], defaultPageSize = TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  const total = Array.isArray(items) ? items.length : 0
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  // Derive clamped page — avoids syncing setState in an effect when filters shrink the list.
  const safePage = Math.min(Math.max(1, page), pageCount)

  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return (items || []).slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const setPageSize = (next) => {
    const size = Math.max(1, Number(next) || defaultPageSize)
    setPageSizeState(size)
    setPage(1)
  }

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice,
  }
}
