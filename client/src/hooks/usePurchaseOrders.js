// usePurchaseOrders — RTK orders slice wrapper (Express → RTK → hook → UI)
import { useCallback, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult } from '@/rtk/asResult'
import {
  ORDERS_PAGE_SIZE,
  patchOrderFilters,
  clearOrderDetail,
  fetchOrders,
  loadOrderFormOptions,
  fetchOrderDetail,
  fetchOrderHistory,
  generateOrder as generateOrderThunk,
  printOrder as printOrderThunk,
} from '@/rtk/features/orders/ordersSlice'

export { ORDERS_PAGE_SIZE }

const EMPTY_FILTERS = {}

export function usePurchaseOrders(initialFilters = EMPTY_FILTERS) {
  const dispatch = useAppDispatch()
  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    selected,
    history,
    supplierOptions,
    productOptions,
  } = useAppSelector((state) => state.orders)

  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (initialFilters && Object.keys(initialFilters).length) {
      dispatch(patchOrderFilters(initialFilters))
    }
  }, [dispatch, initialFilters])

  useEffect(() => {
    void dispatch(fetchOrders(filters))
  }, [dispatch, filters])

  const updateFilters = useCallback(
    (patch) => {
      dispatch(patchOrderFilters(patch))
    },
    [dispatch],
  )

  return {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    selected,
    history,
    supplierOptions,
    productOptions,
    updateFilters,
    setPage: (page) => updateFilters({ page }),
    loadFormOptions: () => dispatch(loadOrderFormOptions()),
    fetchDetail: (id) => asResult(dispatch(fetchOrderDetail(id)).unwrap()),
    fetchHistory: (id) => asResult(dispatch(fetchOrderHistory(id)).unwrap()),
    clearDetail: () => dispatch(clearOrderDetail()),
    generateOrder: (payload) => asResult(dispatch(generateOrderThunk(payload)).unwrap()),
    printOrder: (idOrOrder) => asResult(dispatch(printOrderThunk(idOrOrder)).unwrap()),
    reload: () => dispatch(fetchOrders(filtersRef.current)),
  }
}
