import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

const EMPTY_COMPANY = {
  name: '',
  logoUrl: '',
  contactNumbers: '',
  whatsappNumber: '',
  facebookUrl: '',
  instagramUrl: '',
  registrationTaxId: '',
  businessAddress: '',
  supportEmail: '',
}

// JSON body, or multipart FormData when a new logo File is selected.
export function buildAdminCompanyPayload(fields) {
  const base = {
    name: String(fields.name || '').trim(),
    contactNumbers: String(fields.contactNumbers || '').trim(),
    whatsappNumber: fields.whatsappNumber?.trim() || undefined,
    facebookUrl: fields.facebookUrl?.trim() || undefined,
    instagramUrl: fields.instagramUrl?.trim() || undefined,
    registrationTaxId: fields.registrationTaxId?.trim() || undefined,
    businessAddress: fields.businessAddress?.trim() || undefined,
    supportEmail: fields.supportEmail?.trim() || undefined,
  }

  const logo = fields.logo instanceof File && fields.logo.size > 0 ? fields.logo : null

  if (logo) {
    const form = new FormData()
    Object.entries(base).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    })
    form.append('logo', logo)
    return form
  }

  return base
}

// Live B2B Admin company profile (/api/admin/company).
export function useAdminCompany() {
  const [company, setCompany] = useState(EMPTY_COMPANY)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiClient.get(endpoints.admin.company.get)
    if (!result.success) {
      setCompany(EMPTY_COMPANY)
      setError(result.error || 'Failed to load company details')
      setLoading(false)
      return
    }
    setCompany({ ...EMPTY_COMPANY, ...(result.data || {}) })
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateCompany = useCallback(
    async (fields) => {
      setMutating(true)
      const result = await apiClient.patch(
        endpoints.admin.company.update,
        buildAdminCompanyPayload(fields),
      )
      setMutating(false)
      if (result.success) {
        setCompany({ ...EMPTY_COMPANY, ...(result.data || {}) })
      }
      return result
    },
    [],
  )

  return {
    company,
    loading,
    mutating,
    error,
    reload: load,
    updateCompany,
  }
}
