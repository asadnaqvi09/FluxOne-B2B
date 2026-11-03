import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export function useBranchRosterOptions({ designationLimit = 100, staffLimit = 100 } = {}) {
  const [designations, setDesignations] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    const [resDesig, resStaff] = await Promise.all([
      apiClient.get(endpoints.branch.designations.list, { limit: designationLimit }),
      apiClient.get(endpoints.branch.staff.list, { limit: staffLimit, status: 'active' }),
    ])
    setLoading(false)

    if (resDesig.success) {
      setDesignations(resDesig.data.items || resDesig.data || [])
    }
    if (resStaff.success) {
      setStaff(resStaff.data.items || resStaff.data || [])
    }
    return { resDesig, resStaff }
  }, [designationLimit, staffLimit])

  useEffect(() => {
    void reload()
  }, [reload])

  return { designations, staff, loading, reload }
}
