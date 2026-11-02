import { useCallback, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { CATEGORY_ACTIVE_QUERY } from '@/lib/products/productCatalogCache'
import { filterActiveCategories } from '@/lib/products/mapProduct'

export function useBranchDiscounts() {
  const [discounts, setDiscounts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    const res = await apiClient.get(endpoints.products.categories, CATEGORY_ACTIVE_QUERY)
    if (res.success && res.data) {
      const all = filterActiveCategories(
        Array.isArray(res.data) ? res.data : res.data.items || [],
      )
      setCategories(all.filter((c) => !c.parentId))
    }
    return res
  }, [])

  const fetchDiscounts = useCallback(async (params = {}) => {
    setLoading(true)
    const res = await apiClient.get(endpoints.branch.discounts.list, params)
    setLoading(false)
    if (res.success && res.data) {
      setDiscounts(res.data || [])
    }
    return res
  }, [])

  const createDiscount = useCallback(async (payload) => {
    return apiClient.post(endpoints.branch.discounts.create, payload)
  }, [])

  const updateDiscount = useCallback(async (id, payload) => {
    return apiClient.put(endpoints.branch.discounts.update(id), payload)
  }, [])

  const deleteDiscount = useCallback(async (id) => {
    return apiClient.delete(endpoints.branch.discounts.delete(id))
  }, [])

  return {
    discounts,
    categories,
    loading,
    fetchDiscounts,
    fetchCategories,
    createDiscount,
    updateDiscount,
    deleteDiscount,
  }
}
