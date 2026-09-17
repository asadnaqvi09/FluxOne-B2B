// Inventory Dashboard Slice — Express /api/inventory/dashboard → RTK → useInventoryDashboard
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import {
  EMPTY_KPIS,
  normalizeAlertsPayload,
  normalizeKpis,
  normalizeStockGraph,
} from '@/lib/mapInventoryDashboard'

export const ALERTS_PAGE_SIZE = 8

const initialState = {
  kpis: { ...EMPTY_KPIS },
  alerts: [],
  alertsPagination: {
    page: 1,
    limit: ALERTS_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
  stockOutPie: [],
  alertsPage: 1,
  alertsLimit: ALERTS_PAGE_SIZE,
  loading: false,
  alertsLoading: false,
  error: null,
}

export const fetchInventoryDashboard = createAsyncThunk(
  'inventoryDashboard/fetch',
  async (_, { getState, rejectWithValue }) => {
    const page = 1
    const limit = getState().inventoryDashboard.alertsLimit || ALERTS_PAGE_SIZE
    const [overviewRes, alertsRes, graphRes] = await Promise.all([
      apiClient.get(endpoints.dashboard.overview),
      apiClient.get(endpoints.dashboard.alerts, {
        page,
        limit,
      }),
      apiClient.get(endpoints.dashboard.stockGraph),
    ])

    const errors = []
    let kpis = { ...EMPTY_KPIS }
    if (overviewRes.success && overviewRes.data) {
      kpis = normalizeKpis(overviewRes.data)
    } else if (overviewRes.error) {
      errors.push(overviewRes.error)
    }

    let alerts = []
    let alertsPagination = {
      page,
      limit,
      total: 0,
      pageCount: 1,
    }
    if (alertsRes.success) {
      const normalized = normalizeAlertsPayload(alertsRes.data, {
        page,
        limit,
      })
      alerts = normalized.items
      alertsPagination = normalized.pagination
    } else if (alertsRes.error) {
      errors.push(alertsRes.error)
    }

    let stockOutPie = []
    if (graphRes.success) {
      stockOutPie = normalizeStockGraph(graphRes.data).items
    } else if (graphRes.error) {
      errors.push(graphRes.error)
    }

    if (errors.length && !overviewRes.success && !alertsRes.success && !graphRes.success) {
      return rejectWithValue(errors[0])
    }

    return {
      kpis,
      alerts,
      alertsPagination,
      stockOutPie,
      alertsPage: page,
      error: errors[0] || null,
    }
  },
)

export const fetchInventoryAlertsPage = createAsyncThunk(
  'inventoryDashboard/fetchAlertsPage',
  async (arg, { getState, rejectWithValue }) => {
    const state = getState().inventoryDashboard
    const isObj = arg != null && typeof arg === 'object'
    const page = Math.max(1, Number(isObj ? arg.page : arg) || 1)
    const limit = Math.max(
      1,
      Number(isObj && arg.limit != null ? arg.limit : state.alertsLimit) || ALERTS_PAGE_SIZE,
    )
    const alertsRes = await apiClient.get(endpoints.dashboard.alerts, {
      page,
      limit,
    })
    if (!alertsRes.success) {
      return rejectWithValue(alertsRes.error || 'Failed to load alerts')
    }
    const normalized = normalizeAlertsPayload(alertsRes.data, {
      page,
      limit,
    })
    return {
      alerts: normalized.items,
      alertsPagination: normalized.pagination,
      alertsPage: page,
      alertsLimit: limit,
    }
  },
)

const inventoryDashboardSlice = createSlice({
  name: 'inventoryDashboard',
  initialState,
  reducers: {
    clearInventoryDashboardError(state) {
      state.error = null
    },
    setAlertsLimit(state, action) {
      state.alertsLimit = Math.max(1, Number(action.payload) || ALERTS_PAGE_SIZE)
      state.alertsPage = 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventoryDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInventoryDashboard.fulfilled, (state, action) => {
        state.loading = false
        state.kpis = action.payload.kpis
        state.alerts = action.payload.alerts
        state.alertsPagination = action.payload.alertsPagination
        state.stockOutPie = action.payload.stockOutPie
        state.alertsPage = action.payload.alertsPage
        state.error = action.payload.error
      })
      .addCase(fetchInventoryDashboard.rejected, (state, action) => {
        state.loading = false
        state.kpis = { ...EMPTY_KPIS }
        state.alerts = []
        state.stockOutPie = []
        state.error = action.payload || action.error.message
      })
      .addCase(fetchInventoryAlertsPage.pending, (state, action) => {
        const arg = action.meta.arg
        const isObj = arg != null && typeof arg === 'object'
        state.alertsPage = Math.max(1, Number(isObj ? arg.page : arg) || 1)
        if (isObj && arg.limit != null) {
          state.alertsLimit = Math.max(1, Number(arg.limit) || ALERTS_PAGE_SIZE)
        }
        state.alertsLoading = true
      })
      .addCase(fetchInventoryAlertsPage.fulfilled, (state, action) => {
        state.alertsLoading = false
        state.alerts = action.payload.alerts
        state.alertsPagination = action.payload.alertsPagination
        state.alertsPage = action.payload.alertsPage
        if (action.payload.alertsLimit != null) {
          state.alertsLimit = action.payload.alertsLimit
        }
      })
      .addCase(fetchInventoryAlertsPage.rejected, (state, action) => {
        state.alertsLoading = false
        state.error = action.payload || action.error.message
      })
  },
})

export const { clearInventoryDashboardError, setAlertsLimit } = inventoryDashboardSlice.actions
export default inventoryDashboardSlice.reducer
