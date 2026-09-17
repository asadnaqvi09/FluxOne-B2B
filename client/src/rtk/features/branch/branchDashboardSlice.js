// Branch Dashboard Slice — Express /api/branch/dashboard → RTK → useBranchDashboard
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { emptyBranchDashboard, mergeBranchDashboard } from '@/lib/mapBranchDashboard'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Clamp so neither end is after today, and From ≤ To (expand To if From moves past it)
function normalizeRange(from, to) {
  const today = todayIso()
  let nextFrom = from || today
  let nextTo = to || nextFrom
  if (nextFrom > today) nextFrom = today
  if (nextTo > today) nextTo = today
  if (nextFrom > nextTo) nextTo = nextFrom
  return { from: nextFrom, to: nextTo }
}

const initialToday = todayIso()

const initialState = {
  from: initialToday,
  to: initialToday,
  date: initialToday,
  data: emptyBranchDashboard(),
  loading: false,
  source: 'live',
  error: null,
}

export const fetchBranchDashboard = createAsyncThunk(
  'branchDashboard/fetch',
  async (range, { getState, rejectWithValue }) => {
    const state = getState().branchDashboard
    const { from, to } = normalizeRange(
      range?.from ?? state.from,
      range?.to ?? state.to,
    )
    try {
      // Server accepts `date` and/or `from`/`to`
      const result = await apiClient.get(endpoints.branch.dashboard, {
        date: to,
        from,
        to,
      })
      if (result.success && result.data) {
        return {
          from,
          to,
          date: to,
          data: mergeBranchDashboard({ ...result.data, date: to }),
          source: 'live',
          error: null,
        }
      }
      return {
        from,
        to,
        date: to,
        data: emptyBranchDashboard(to),
        source: 'live',
        error: result.error || null,
      }
    } catch (err) {
      return rejectWithValue({
        from,
        to,
        date: to,
        message: err?.message || 'Failed to load dashboard',
      })
    }
  },
)

const branchDashboardSlice = createSlice({
  name: 'branchDashboard',
  initialState,
  reducers: {
    // Patch From and/or To; auto-clamps to today and keeps From ≤ To
    setBranchDashboardRange(state, action) {
      const patch = action.payload || {}
      const next = normalizeRange(
        patch.from !== undefined ? patch.from : state.from,
        patch.to !== undefined ? patch.to : state.to,
      )
      state.from = next.from
      state.to = next.to
      state.date = next.to
    },
    // Legacy single-date setter (sets both From and To)
    setBranchDashboardDate(state, action) {
      const next = normalizeRange(action.payload, action.payload)
      state.from = next.from
      state.to = next.to
      state.date = next.to
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranchDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBranchDashboard.fulfilled, (state, action) => {
        state.loading = false
        state.from = action.payload.from
        state.to = action.payload.to
        state.date = action.payload.date
        state.data = action.payload.data
        state.source = action.payload.source
        state.error = action.payload.error
      })
      .addCase(fetchBranchDashboard.rejected, (state, action) => {
        state.loading = false
        const from = action.payload?.from || state.from
        const to = action.payload?.to || state.to
        state.from = from
        state.to = to
        state.date = to
        state.data = emptyBranchDashboard(to)
        state.source = 'live'
        state.error = action.payload?.message || action.error.message
      })
  },
})

export const { setBranchDashboardDate, setBranchDashboardRange } = branchDashboardSlice.actions
export { todayIso as branchDashboardTodayIso }
export default branchDashboardSlice.reducer
