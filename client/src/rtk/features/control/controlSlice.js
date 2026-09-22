// Control Slice — Express /api/inventory/control → RTK → useInventoryControl
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { mapStockMovement, MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { mapPurchaseOrder } from '@/lib/mapPurchaseOrder'
import { mapProduct } from '@/lib/mapProduct'
import { mapSupplier } from '@/lib/mapSupplier'
import {
  getProductCatalog,
  peekProductCatalog,
} from '@/lib/productCatalogCache'

export const CONTROL_PAGE_SIZE = 8

export const LIST_PATH = {
  [MOVEMENT_TYPES.IN]: endpoints.control.stockIn,
  [MOVEMENT_TYPES.OUT]: endpoints.control.stockOut,
  [MOVEMENT_TYPES.ADJUSTMENT]: endpoints.control.adjustments,
  [MOVEMENT_TYPES.DAMAGED]: endpoints.control.damaged,
  [MOVEMENT_TYPES.EXPIRED]: endpoints.control.expired,
}

const CREATE_PATH = {
  [MOVEMENT_TYPES.IN]: endpoints.control.stockIn,
  [MOVEMENT_TYPES.OUT]: endpoints.control.stockOut,
  [MOVEMENT_TYPES.ADJUSTMENT]: endpoints.control.adjustments,
  [MOVEMENT_TYPES.DAMAGED]: endpoints.control.damaged,
  [MOVEMENT_TYPES.EXPIRED]: endpoints.control.expired,
}

const ITEM_PATH = {
  [MOVEMENT_TYPES.ADJUSTMENT]: endpoints.control.adjustment,
  [MOVEMENT_TYPES.DAMAGED]: endpoints.control.damagedItem,
  [MOVEMENT_TYPES.EXPIRED]: endpoints.control.expiredItem,
}

function emptyCatalog() {
  return {
    parents: [],
    childrenByParent: {},
    all: [],
    taxes: [],
    offers: [],
  }
}

function catalogToState(catalog) {
  if (!catalog) return emptyCatalog()
  const map = catalog.childrenByParent
  return {
    parents: catalog.parents || [],
    childrenByParent:
      map instanceof Map ? Object.fromEntries(map) : map || {},
    all: catalog.all || [],
    taxes: catalog.taxes || [],
    offers: catalog.offers || [],
  }
}

function defaultFilters(overrides = {}) {
  return {
    q: '',
    type: '',
    categoryId: '',
    subcategoryId: '',
    scale: '',
    page: 1,
    limit: CONTROL_PAGE_SIZE,
    ...overrides,
  }
}

function emptyBucket(overrides = {}) {
  return {
    items: [],
    pagination: {
      page: 1,
      limit: CONTROL_PAGE_SIZE,
      total: 0,
      pageCount: 1,
    },
    filters: defaultFilters(overrides),
    loading: false,
    mutating: false,
    error: null,
  }
}

const initialState = {
  catalog: catalogToState(peekProductCatalog()),
  catalogLoading: !peekProductCatalog(),
  byType: {},
}

function ensureBucket(state, movementType) {
  if (!state.byType[movementType]) {
    state.byType[movementType] = emptyBucket()
  }
  return state.byType[movementType]
}

export const loadControlCatalog = createAsyncThunk(
  'control/loadCatalog',
  async ({ force = false } = {}) => catalogToState(await getProductCatalog({ force })),
)

export const fetchControlMovements = createAsyncThunk(
  'control/fetchList',
  async ({ movementType, filters }, { rejectWithValue }) => {
    const listPath = LIST_PATH[movementType]
    if (!listPath) return rejectWithValue('Unknown movement type')
    const next = filters || defaultFilters()
    const result = await apiClient.get(listPath, {
      page: next.page || 1,
      limit: next.limit || CONTROL_PAGE_SIZE,
      q: next.q || undefined,
      categoryId: next.categoryId || undefined,
      subcategoryId: next.subcategoryId || undefined,
      scale: next.scale || undefined,
      type: next.type || undefined,
    })
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load movements')
    }
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : []
    return {
      movementType,
      items: rows.map(mapStockMovement),
      pagination:
        data.pagination || {
          page: next.page || 1,
          limit: next.limit || CONTROL_PAGE_SIZE,
          total: rows.length,
          pageCount: 1,
        },
    }
  },
)

export const createMovement = createAsyncThunk(
  'control/create',
  async ({ movementType, body }, { getState, dispatch, rejectWithValue }) => {
    const path = CREATE_PATH[movementType]
    if (!path) return rejectWithValue('Unknown movement type')
    const result = await apiClient.post(path, body)
    if (!result.success) return rejectWithValue(result.error || 'Create failed')
    const filters = getState().control.byType[movementType]?.filters || defaultFilters()
    void dispatch(fetchControlMovements({ movementType, filters }))
    return result
  },
)

export const updateMovement = createAsyncThunk(
  'control/update',
  async ({ movementType, id, body }, { getState, dispatch, rejectWithValue }) => {
    const pathFn = ITEM_PATH[movementType]
    if (!pathFn) return rejectWithValue('Edit not supported for this tab')
    const result = await apiClient.patch(pathFn(id), body)
    if (!result.success) return rejectWithValue(result.error || 'Update failed')
    const filters = getState().control.byType[movementType]?.filters || defaultFilters()
    void dispatch(fetchControlMovements({ movementType, filters }))
    return result
  },
)

export const deleteMovement = createAsyncThunk(
  'control/delete',
  async ({ movementType, id }, { getState, dispatch, rejectWithValue }) => {
    const pathFn = ITEM_PATH[movementType]
    if (!pathFn) return rejectWithValue('Delete not supported for this tab')
    const result = await apiClient.delete(pathFn(id))
    if (!result.success) return rejectWithValue(result.error || 'Delete failed')
    const filters = getState().control.byType[movementType]?.filters || defaultFilters()
    void dispatch(fetchControlMovements({ movementType, filters }))
    return result
  },
)

export const stockInFromOrder = createAsyncThunk(
  'control/stockInFromOrder',
  async ({ movementType, purchaseOrderId }, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.post(endpoints.control.stockInFromOrder, {
      purchaseOrderId,
    })
    if (!result.success) return rejectWithValue(result.error || 'Stock-in failed')
    const filters = getState().control.byType[movementType]?.filters || defaultFilters()
    void dispatch(fetchControlMovements({ movementType, filters }))
    return result
  },
)

// Standalone helpers used by control dialogs (still Express → apiClient)
export async function fetchControlProductOptions({
  categoryId,
  subcategoryId,
  q,
  limit = 50,
} = {}) {
  const result = await apiClient.get(endpoints.products.list, {
    page: 1,
    limit,
    categoryId: categoryId || undefined,
    subcategoryId: subcategoryId || undefined,
    q: q || undefined,
    status: 'active',
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return { success: true, items: rows.map(mapProduct) }
}

export async function fetchControlSuppliers() {
  const result = await apiClient.get(endpoints.suppliers.list, {
    page: 1,
    limit: 50,
    active: 'active',
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return { success: true, items: rows.map(mapSupplier) }
}

export async function fetchApprovedPurchaseOrders() {
  const result = await apiClient.get(endpoints.orders.list, {
    page: 1,
    limit: 50,
    status: 'approved',
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return { success: true, items: rows.map(mapPurchaseOrder) }
}

export async function fetchPurchaseOrderDetail(id) {
  const result = await apiClient.get(endpoints.orders.detail(id))
  if (!result.success) return result
  return { success: true, data: mapPurchaseOrder(result.data) }
}

export async function fetchEmployeeLookups({ q } = {}) {
  const result = await apiClient.get(endpoints.lookups.employees, {
    page: 1,
    limit: 50,
    q: q || undefined,
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return {
    success: true,
    items: rows.map((row) => ({
      userId: row.userId,
      staffId: row.staffId,
      fullName: row.fullName || '',
      email: row.email || '',
      designation: row.designation || '',
    })),
  }
}

const controlSlice = createSlice({
  name: 'control',
  initialState,
  reducers: {
    ensureControlType(state, action) {
      const { movementType, initialFilters } = action.payload
      if (!state.byType[movementType]) {
        state.byType[movementType] = emptyBucket(initialFilters)
      }
    },
    patchControlFilters(state, action) {
      const { movementType, patch } = action.payload
      const bucket = ensureBucket(state, movementType)
      const next = { ...bucket.filters, ...patch }
      const resets =
        patch.q !== undefined ||
        patch.categoryId !== undefined ||
        patch.subcategoryId !== undefined ||
        patch.scale !== undefined ||
        patch.type !== undefined ||
        patch.limit !== undefined
      if (resets && patch.page === undefined) next.page = 1
      bucket.filters = next
    },
    setControlPage(state, action) {
      const { movementType, page } = action.payload
      const bucket = ensureBucket(state, movementType)
      bucket.filters = { ...bucket.filters, page }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadControlCatalog.pending, (state) => {
        if (!state.catalog?.parents?.length) state.catalogLoading = true
      })
      .addCase(loadControlCatalog.fulfilled, (state, action) => {
        state.catalog = action.payload
        state.catalogLoading = false
      })
      .addCase(loadControlCatalog.rejected, (state) => {
        state.catalogLoading = false
      })
      .addCase(fetchControlMovements.pending, (state, action) => {
        const movementType = action.meta.arg.movementType
        const bucket = ensureBucket(state, movementType)
        bucket.loading = true
        bucket.error = null
      })
      .addCase(fetchControlMovements.fulfilled, (state, action) => {
        const { movementType, items, pagination } = action.payload
        const bucket = ensureBucket(state, movementType)
        bucket.loading = false
        bucket.items = items
        bucket.pagination = pagination
      })
      .addCase(fetchControlMovements.rejected, (state, action) => {
        const movementType = action.meta.arg.movementType
        const bucket = ensureBucket(state, movementType)
        bucket.loading = false
        bucket.items = []
        bucket.error = action.payload || action.error.message
      })
      .addCase(createMovement.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(createMovement.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(createMovement.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(updateMovement.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(updateMovement.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(updateMovement.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(deleteMovement.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(deleteMovement.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(deleteMovement.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(stockInFromOrder.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(stockInFromOrder.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(stockInFromOrder.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
  },
})

export const { ensureControlType, patchControlFilters, setControlPage } = controlSlice.actions
export default controlSlice.reducer
