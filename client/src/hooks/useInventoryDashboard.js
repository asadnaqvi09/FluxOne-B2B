// useInventoryDashboard — RTK dashboard slice wrapper (Express → RTK → useInventoryDashboard)
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import {
  ALERTS_PAGE_SIZE,
  fetchInventoryDashboard,
  fetchInventoryAlertsPage,
} from '@/rtk/features/dashboard/inventoryDashboardSlice'

export { ALERTS_PAGE_SIZE }

export function useInventoryDashboard() {
  const dispatch = useAppDispatch()
  const {
    kpis,
    alerts,
    alertsPagination,
    stockOutPie,
    alertsPage,
    alertsLimit,
    loading,
    alertsLoading,
    error,
  } = useAppSelector((state) => state.inventoryDashboard)

  useEffect(() => {
    void dispatch(fetchInventoryDashboard())
  }, [dispatch])

  const setAlertsPage = useCallback(
    async (nextPage) => {
      const page = Math.max(1, Number(nextPage) || 1)
      if (page === alertsPage) return
      await dispatch(fetchInventoryAlertsPage({ page, limit: alertsLimit }))
    },
    [alertsPage, alertsLimit, dispatch],
  )

  const setAlertsPageSize = useCallback(
    async (nextLimit) => {
      const limit = Math.max(1, Number(nextLimit) || ALERTS_PAGE_SIZE)
      if (limit === alertsLimit && alertsPage === 1) return
      await dispatch(fetchInventoryAlertsPage({ page: 1, limit }))
    },
    [alertsLimit, alertsPage, dispatch],
  )

  return {
    kpis,
    alerts,
    alertsPagination,
    stockOutPie,
    alertsPage,
    alertsLimit,
    setAlertsPage,
    setAlertsPageSize,
    loading,
    alertsLoading,
    error,
    reload: () => dispatch(fetchInventoryDashboard()),
  }
}
