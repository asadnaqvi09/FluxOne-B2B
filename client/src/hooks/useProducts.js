// useProducts — RTK products slice wrapper (Express → RTK → hook → UI)
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult, catalogActiveOnly, catalogForUi } from '@/rtk/asResult'
import {
  PRODUCTS_PAGE_SIZE,
  patchProductFilters,
  loadProductCatalog,
  reloadProductCategories,
  fetchProducts,
  loadBundleOptions as loadBundleOptionsThunk,
  createProduct as createProductThunk,
  updateProduct as updateProductThunk,
  setProductStatus as setProductStatusThunk,
  deleteProduct as deleteProductThunk,
  exportProductsCsv,
  fetchProductDeleteInfo as fetchProductDeleteInfoThunk,
  importProducts as importProductsThunk,
  scanBarcode as scanBarcodeThunk,
  fetchProductDetail as fetchProductDetailThunk,
  fetchBarcodePng as fetchBarcodePngThunk,
  createCategory as createCategoryThunk,
  updateCategory as updateCategoryThunk,
  deleteCategory as deleteCategoryThunk,
  setCategoryActive as setCategoryActiveThunk,
} from '@/rtk/features/products/productsSlice'

export { PRODUCTS_PAGE_SIZE }

const EMPTY_FILTERS = {}

export function useProducts(initialFilters = EMPTY_FILTERS, options = {}) {
  const skipList = Boolean(options.skipList)
  const categoryActive = options.categoryActive || 'active'
  const catalogIncludeInactive = categoryActive === 'all'
  const dispatch = useAppDispatch()
  const {
    items,
    pagination,
    filters,
    loading,
    catalogLoading,
    mutating,
    error,
    catalog: catalogRaw,
    bundleOptions,
    bundleOptionsLoading,
  } = useAppSelector((state) => state.products)

  const catalog = useMemo(() => {
    const ui = catalogForUi(catalogRaw)
    return catalogIncludeInactive ? ui : catalogActiveOnly(ui)
  }, [catalogRaw, catalogIncludeInactive])
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (initialFilters && Object.keys(initialFilters).length) {
      dispatch(patchProductFilters(initialFilters))
    }
  }, [dispatch, initialFilters])

  useEffect(() => {
    void dispatch(loadProductCatalog({ categoryActive }))
  }, [dispatch, categoryActive])

  useEffect(() => {
    if (skipList) return
    void dispatch(fetchProducts(filters))
  }, [dispatch, filters, skipList])

  const updateFilters = useCallback(
    (patch) => {
      dispatch(patchProductFilters(patch))
    },
    [dispatch],
  )

  const selectedCategorySubs = useMemo(() => {
    if (!filters.categoryId) return []
    const subs = catalog.childrenByParent.get(filters.categoryId) || []
    return catalogIncludeInactive ? subs : subs.filter((row) => row.isActive !== false)
  }, [catalog.childrenByParent, filters.categoryId, catalogIncludeInactive])

  const loadCatalog = useCallback(
    ({ force = false } = {}) =>
      dispatch(loadProductCatalog({ force, categoryActive })).unwrap(),
    [dispatch, categoryActive],
  )

  const reloadCategories = useCallback(
    () => dispatch(reloadProductCategories(categoryActive)).unwrap(),
    [dispatch, categoryActive],
  )

  const loadBundleOptions = useCallback(
    () => dispatch(loadBundleOptionsThunk()),
    [dispatch],
  )

  const createProduct = useCallback(
    (fields) => asResult(dispatch(createProductThunk(fields)).unwrap()),
    [dispatch],
  )

  const updateProduct = useCallback(
    (id, fields) => asResult(dispatch(updateProductThunk({ id, fields })).unwrap()),
    [dispatch],
  )

  const setProductStatus = useCallback(
    async (id, status) => {
      const result = await asResult(
        dispatch(setProductStatusThunk({ id, status })).unwrap(),
      )
      return result.success ? { success: true } : result
    },
    [dispatch],
  )

  const deleteProduct = useCallback(
    ({ id, permanent = false }) =>
      asResult(dispatch(deleteProductThunk({ id, permanent })).unwrap()),
    [dispatch],
  )

  const fetchProductDeleteInfo = useCallback(
    (id) => asResult(dispatch(fetchProductDeleteInfoThunk(id)).unwrap()),
    [dispatch],
  )

  const exportCsv = useCallback(
    () => asResult(dispatch(exportProductsCsv()).unwrap()),
    [dispatch],
  )

  const importProducts = useCallback(
    (rows) => asResult(dispatch(importProductsThunk(rows)).unwrap()),
    [dispatch],
  )

  const scanBarcode = useCallback(
    (barcode) => dispatch(scanBarcodeThunk(barcode)).unwrap(),
    [dispatch],
  )

  const fetchProductDetail = useCallback(
    (id) => asResult(dispatch(fetchProductDetailThunk(id)).unwrap()),
    [dispatch],
  )

  const fetchBarcodePng = useCallback(
    (id) => asResult(dispatch(fetchBarcodePngThunk(id)).unwrap()),
    [dispatch],
  )

  const createCategory = useCallback(
    (payload) => asResult(dispatch(createCategoryThunk(payload)).unwrap()),
    [dispatch],
  )

  const updateCategory = useCallback(
    (id, payload) => asResult(dispatch(updateCategoryThunk({ id, ...payload })).unwrap()),
    [dispatch],
  )

  const deleteCategory = useCallback(
    (id) => asResult(dispatch(deleteCategoryThunk(id)).unwrap()),
    [dispatch],
  )

  const setCategoryActive = useCallback(
    (id, isActive) =>
      asResult(dispatch(setCategoryActiveThunk({ id, isActive })).unwrap()),
    [dispatch],
  )

  return {
    items,
    pagination,
    filters,
    loading: skipList ? false : loading,
    catalogLoading,
    mutating,
    error,
    catalog,
    selectedCategorySubs,
    bundleOptions,
    bundleOptionsLoading,
    updateFilters,
    setPage: (page) => updateFilters({ page }),
    reload: () => dispatch(fetchProducts(filtersRef.current)),
    loadCatalog,
    reloadCategories,
    loadBundleOptions,
    createProduct,
    updateProduct,
    setProductStatus,
    deleteProduct,
    fetchProductDeleteInfo,
    importProducts,
    scanBarcode,
    fetchProductDetail,
    fetchBarcodePng,
    exportCsv,
    createCategory,
    updateCategory,
    deleteCategory,
    setCategoryActive,
  }
}
