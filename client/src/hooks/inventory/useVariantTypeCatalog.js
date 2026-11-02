import { useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export function useVariantTypeCatalog({ onError } = {}) {
  const [variantTypes, setVariantTypes] = useState([])
  const [variantsLoading, setVariantsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadVariantTypes() {
      setVariantsLoading(true)
      const res = await apiClient.get(endpoints.branch.resources.variantTypes.list, {
        active: 'active',
        includeValues: true,
      })
      if (cancelled) return
      if (!res.success) {
        onError?.(res.error || 'Failed to load variant types')
        setVariantTypes([])
        setVariantsLoading(false)
        return
      }
      const rows = Array.isArray(res.data) ? res.data : []
      setVariantTypes(
        rows.map((t) => ({
          id: t.id,
          name: t.name,
          isCustom: false,
          values: (t.values || [])
            .filter((v) => v.isActive !== false)
            .map((v) => ({ id: v.id, name: v.name, isCustom: false })),
        })),
      )
      setVariantsLoading(false)
    }

    void loadVariantTypes()
    return () => {
      cancelled = true
    }
  }, [onError])

  return { variantTypes, setVariantTypes, variantsLoading }
}
