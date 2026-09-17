// Suppliers Slice — Express /api/inventory/suppliers → RTK → useSuppliers
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { buildSupplierPayload, mapSupplier } from '@/lib/mapSupplier'

export const SUPPLIERS_PAGE_SIZE = 8

function defaultFilters(overrides = {}) {
  return {
    q: '',
    active: 'active',
    page: 1,
    limit: SUPPLIERS_PAGE_SIZE,
    ...overrides,
  }
}

const initialState = {
  items: [],
  pagination: {
    page: 1,
    limit: SUPPLIERS_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
  filters: defaultFilters(),
  loading: false,
  mutating: false,
  error: null,
}

export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchList',
  async (filters, { rejectWithValue }) => {
    const next = filters || defaultFilters()
    const result = await apiClient.get(endpoints.suppliers.list, {
      page: next.page || 1,
      limit: next.limit || SUPPLIERS_PAGE_SIZE,
      q: next.q || undefined,
      active: next.active || 'active',
    })
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load suppliers')
    }
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
    return {
      items: rows.map(mapSupplier),
      pagination:
        data.pagination || {
          page: next.page || 1,
          limit: next.limit || SUPPLIERS_PAGE_SIZE,
          total: rows.length,
          pageCount: 1,
        },
    }
  },
)

export const createSupplier = createAsyncThunk(
  'suppliers/create',
  async (fields, { getState, dispatch, rejectWithValue }) => {
    const body = buildSupplierPayload(fields)
    const result = await apiClient.post(endpoints.suppliers.create, body)
    if (!result.success) return rejectWithValue(result.error || 'Create failed')
    const filters = { ...getState().suppliers.filters, page: 1 }
    dispatch(setSupplierFilters(filters))
    await dispatch(fetchSuppliers(filters))
    return { success: true, data: mapSupplier(result.data) }
  },
)

export const updateSupplier = createAsyncThunk(
  'suppliers/update',
  async ({ id, fields }, { getState, dispatch, rejectWithValue }) => {
    const body = buildSupplierPayload(fields)
    const result = await apiClient.patch(endpoints.suppliers.update(id), body)
    if (!result.success) return rejectWithValue(result.error || 'Update failed')
    await dispatch(fetchSuppliers(getState().suppliers.filters))
    return { success: true, data: mapSupplier(result.data) }
  },
)

export const deleteSupplier = createAsyncThunk(
  'suppliers/delete',
  async (id, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.delete(endpoints.suppliers.remove(id))
    if (!result.success) return rejectWithValue(result.error || 'Delete failed')
    await dispatch(fetchSuppliers(getState().suppliers.filters))
    return result
  },
)

export const setSupplierActive = createAsyncThunk(
  'suppliers/setActive',
  async ({ id, isActive }, { getState, rejectWithValue }) => {
    const result = await apiClient.patch(endpoints.suppliers.status(id), { isActive })
    if (!result.success) return rejectWithValue(result.error || 'Status update failed')
    return { id, isActive, data: mapSupplier(result.data) }
  },
)

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    setSupplierFilters(state, action) {
      state.filters = action.payload
    },
    patchSupplierFilters(state, action) {
      const patch = action.payload || {}
      const next = { ...state.filters, ...patch }
      if (
        (patch.q !== undefined || patch.limit !== undefined) &&
        patch.page === undefined
      ) {
        next.page = 1
      }
      state.filters = next
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.pagination = action.payload.pagination
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false
        state.items = []
        state.error = action.payload || action.error.message
      })
      .addCase(createSupplier.pending, (state) => {
        state.mutating = true
      })
      .addCase(createSupplier.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(createSupplier.rejected, (state) => {
        state.mutating = false
      })
      .addCase(updateSupplier.pending, (state) => {
        state.mutating = true
      })
      .addCase(updateSupplier.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(updateSupplier.rejected, (state) => {
        state.mutating = false
      })
      .addCase(deleteSupplier.pending, (state) => {
        state.mutating = true
      })
      .addCase(deleteSupplier.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(deleteSupplier.rejected, (state) => {
        state.mutating = false
      })
      .addCase(setSupplierActive.pending, (state) => {
        state.mutating = true
      })
      .addCase(setSupplierActive.fulfilled, (state, action) => {
        state.mutating = false
        const { id, isActive, data } = action.payload
        const activeFilter = state.filters.active
        const shouldRemove =
          (activeFilter === true && !isActive) || (activeFilter === false && isActive)
        if (shouldRemove) {
          state.items = state.items.filter((row) => row.id !== id)
          if (state.pagination.total > 0) state.pagination.total -= 1
        } else {
          state.items = state.items.map((row) =>
            row.id === id ? { ...row, ...(data || {}), isActive } : row,
          )
        }
      })
      .addCase(setSupplierActive.rejected, (state) => {
        state.mutating = false
      })
  },
})

export const { setSupplierFilters, patchSupplierFilters } = suppliersSlice.actions
export default suppliersSlice.reducer
