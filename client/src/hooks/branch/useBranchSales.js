import { useCallback, useRef, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { CATEGORY_ACTIVE_QUERY } from '@/lib/products/productCatalogCache'
import { filterActiveCategories } from '@/lib/products/mapProduct'

function applyClientVariantFilter(items, filterVariantType, filterVariantValue) {
  if (!filterVariantType && !filterVariantValue) return items
  return items.filter((sale) => {
    const parts = sale.parts || sale.variantParts || []
    if (!parts.length) return !filterVariantType && !filterVariantValue
    const typeOk =
      !filterVariantType ||
      parts.some((p) => (p.variantTypeId || p.typeId) === filterVariantType)
    const valueOk =
      !filterVariantValue ||
      parts.some((p) => (p.variantValueId || p.valueId) === filterVariantValue)
    return typeOk && valueOk
  })
}

export function useBranchSales() {
  const [sales, setSales] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const fetchSeq = useRef(0)

  const fetchCategories = useCallback(async () => {
    const res = await apiClient.get(endpoints.products.categories, CATEGORY_ACTIVE_QUERY)
    if (res.success && res.data) {
      setCategories(filterActiveCategories(res.data || []))
    }
    return res
  }, [])

  const fetchSales = useCallback(async (params = {}, variantFilters = {}) => {
    const seq = ++fetchSeq.current
    setLoading(true)
    const res = await apiClient.get(endpoints.branch.sales.list, params)
    if (seq !== fetchSeq.current) return res

    setLoading(false)
    if (res.success && res.data) {
      let items = res.data.items || []
      items = applyClientVariantFilter(
        items,
        variantFilters.filterVariantType,
        variantFilters.filterVariantValue,
      )
      setSales(items)
    }
    return res
  }, [])

  const refundSale = useCallback(async (saleId) => {
    return apiClient.post(endpoints.branch.sales.refund(saleId))
  }, [])

  return {
    sales,
    categories,
    loading,
    fetchSales,
    fetchCategories,
    refundSale,
  }
}
