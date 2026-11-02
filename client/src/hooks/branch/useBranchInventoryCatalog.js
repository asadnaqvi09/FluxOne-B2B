import { useCallback, useRef, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { CATEGORY_ACTIVE_QUERY } from '@/lib/products/productCatalogCache'
import { filterActiveCategories } from '@/lib/products/mapProduct'

export function useBranchInventoryCatalog() {
  const [products, setProducts] = useState([])
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

  const fetchInventory = useCallback(async (params = {}) => {
    const seq = ++fetchSeq.current
    setLoading(true)
    const res = await apiClient.get(endpoints.products.list, params)
    if (seq !== fetchSeq.current) return res

    setLoading(false)
    if (res.success && res.data) {
      setProducts(res.data.items || res.data || [])
    }
    return res
  }, [])

  return {
    products,
    categories,
    loading,
    fetchInventory,
    fetchCategories,
  }
}
