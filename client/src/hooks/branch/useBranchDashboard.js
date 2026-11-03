// useBranchDashboard — RTK branchDashboard slice wrapper (Express → RTK → hook → UI)
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import {
  setBranchDashboardDate,
  setBranchDashboardRange,
  fetchBranchDashboard,
} from '@/rtk/features/branch/branchDashboardSlice'

export function useBranchDashboard(initialDate) {
  const dispatch = useAppDispatch()
  const { data, date, from, to, loading, source, error } = useAppSelector(
    (state) => state.branchDashboard,
  )

  useEffect(() => {
    if (initialDate) dispatch(setBranchDashboardDate(initialDate))
  }, [dispatch, initialDate])

  useEffect(() => {
    void dispatch(fetchBranchDashboard({ from, to }))
  }, [dispatch, from, to])

  // Set both ends to the same day (single-day view)
  const setDate = useCallback(
    (next) => {
      dispatch(setBranchDashboardDate(next))
    },
    [dispatch],
  )

  // Patch From and/or To independently
  const setRange = useCallback(
    (patch) => {
      dispatch(setBranchDashboardRange(patch))
    },
    [dispatch],
  )

  return {
    data,
    date,
    from,
    to,
    setDate,
    setRange,
    loading,
    source,
    error,
    reload: () => dispatch(fetchBranchDashboard({ from, to })),
  }
}
