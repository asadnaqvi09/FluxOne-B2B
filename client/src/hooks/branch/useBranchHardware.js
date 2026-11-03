import { useCallback, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export function useBranchHardware() {
  const [hardwareList, setHardwareList] = useState([])
  const [loading, setLoading] = useState(false)

  const loadHardware = useCallback(async (params = {}) => {
    const res = await apiClient.get(endpoints.branch.resources.hardware.list, params)
    if (res.success) {
      setHardwareList(res.data || [])
    }
    return res
  }, [])

  const saveHardware = useCallback(async (formData, { mode, id } = {}) => {
    if (mode === 'create') {
      return apiClient.post(endpoints.branch.resources.hardware.create, formData)
    }
    if (!id) {
      return { success: false, error: 'Missing hardware id' }
    }
    return apiClient.put(endpoints.branch.resources.hardware.update(id), formData)
  }, [])

  const deleteHardware = useCallback(async (id) => {
    return apiClient.delete(endpoints.branch.resources.hardware.delete(id))
  }, [])

  const updateAccessStatus = useCallback(async (id, accessStatus) => {
    const formData = new FormData()
    formData.append('accessStatus', accessStatus)
    return apiClient.put(endpoints.branch.resources.hardware.update(id), formData)
  }, [])

  return {
    hardwareList,
    setHardwareList,
    loading,
    setLoading,
    loadHardware,
    saveHardware,
    deleteHardware,
    updateAccessStatus,
  }
}
