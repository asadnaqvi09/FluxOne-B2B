// useSuppliers — RTK suppliers slice wrapper (Express → RTK → hook → UI)
import { useCallback, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult } from '@/rtk/asResult'
import {
  SUPPLIERS_PAGE_SIZE,
  patchSupplierFilters,
  fetchSuppliers,
  createSupplier as createSupplierThunk,
  updateSupplier as updateSupplierThunk,
  deleteSupplier as deleteSupplierThunk,
  setSupplierActive as setSupplierActiveThunk,
} from '@/rtk/features/suppliers/suppliersSlice'

export { SUPPLIERS_PAGE_SIZE }

const EMPTY_FILTERS = {}

export function useSuppliers(initialFilters = EMPTY_FILTERS) {
  const dispatch = useAppDispatch()
  const { items, pagination, filters, loading, mutating, error } = useAppSelector(
    (state) => state.suppliers,
  )
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (initialFilters && Object.keys(initialFilters).length) {
      dispatch(patchSupplierFilters(initialFilters))
    }
  }, [dispatch, initialFilters])

  useEffect(() => {
    void dispatch(fetchSuppliers(filters))
  }, [dispatch, filters])

  const updateFilters = useCallback(
    (patch) => {
      dispatch(patchSupplierFilters(patch))
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
    updateFilters,
    setPage: (page) => updateFilters({ page }),
    reload: () => dispatch(fetchSuppliers(filtersRef.current)),
    createSupplier: (fields) => asResult(dispatch(createSupplierThunk(fields)).unwrap()),
    updateSupplier: (id, fields) =>
      asResult(dispatch(updateSupplierThunk({ id, fields })).unwrap()),
    deleteSupplier: (id) => asResult(dispatch(deleteSupplierThunk(id)).unwrap()),
    setSupplierActive: (id, isActive) =>
      asResult(dispatch(setSupplierActiveThunk({ id, isActive })).unwrap()),
  }
}
