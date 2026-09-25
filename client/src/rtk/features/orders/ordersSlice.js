// Orders Slice — Express /api/inventory/purchase-orders → RTK → usePurchaseOrders
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { mapPurchaseHistory, mapPurchaseOrder } from '@/lib/mapPurchaseOrder'
import { mapSupplier } from '@/lib/mapSupplier'
import { mapProduct } from '@/lib/mapProduct'
import { downloadPurchaseOrderPdf } from '@/lib/pdfDownload'

export const ORDERS_PAGE_SIZE = 8

function defaultFilters(overrides = {}) {
  return {
    q: '',
    supplierId: '',
    status: '',
    page: 1,
    limit: ORDERS_PAGE_SIZE,
    ...overrides,
  }
}

const initialState = {
  items: [],
  pagination: {
    page: 1,
    limit: ORDERS_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
  filters: defaultFilters(),
  loading: false,
  mutating: false,
  error: null,
  selected: null,
  history: null,
  supplierOptions: [],
  productOptions: [],
}

export const fetchOrders = createAsyncThunk(
  'orders/fetchList',
  async (filters, { rejectWithValue }) => {
    const next = filters || defaultFilters()
    const result = await apiClient.get(endpoints.orders.list, {
      page: next.page || 1,
      limit: next.limit || ORDERS_PAGE_SIZE,
      q: next.q || undefined,
      supplierId: next.supplierId || undefined,
      status: next.status || undefined,
    })
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load orders')
    }
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : []
    return {
      items: rows.map(mapPurchaseOrder),
      pagination:
        data.pagination || {
          page: next.page || 1,
          limit: next.limit || ORDERS_PAGE_SIZE,
          total: rows.length,
          pageCount: 1,
        },
    }
  },
)

export const loadOrderFormOptions = createAsyncThunk('orders/loadFormOptions', async () => {
  const [supRes, prodCollected] = await Promise.all([
    apiClient.get(endpoints.suppliers.list, { page: 1, limit: 50, active: 'active' }),
    (async () => {
      const all = []
      let page = 1
      let pageCount = 1
      do {
        const result = await apiClient.get(endpoints.products.list, {
          type: 'single',
          status: 'active',
          page,
          limit: 50,
        })
        if (!result.success) break
        const data = result.data || {}
        const rows = Array.isArray(data.items) ? data.items : []
        all.push(...rows.map(mapProduct))
        pageCount = data.pagination?.pageCount || 1
        page += 1
      } while (page <= pageCount)
      return all
    })(),
  ])

  const suppliers =
    supRes.success && Array.isArray(supRes.data?.items)
      ? supRes.data.items.map(mapSupplier)
      : []
  return { suppliers, products: prodCollected }
})

export const fetchOrderDetail = createAsyncThunk(
  'orders/fetchDetail',
  async (id, { rejectWithValue }) => {
    const result = await apiClient.get(endpoints.orders.detail(id))
    if (!result.success) return rejectWithValue(result.error || 'Not found')
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
)

export const fetchOrderHistory = createAsyncThunk(
  'orders/fetchHistory',
  async (id, { rejectWithValue }) => {
    const result = await apiClient.get(endpoints.orders.history(id))
    if (!result.success) return rejectWithValue(result.error || 'History failed')
    return { success: true, data: mapPurchaseHistory(result.data) }
  },
)

export const generateOrder = createAsyncThunk(
  'orders/generate',
  async (payload, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.post(endpoints.orders.create, {
      supplierId: payload.supplierId,
      explanation: payload.explanation || undefined,
      sendSms: false,
      lines: payload.lines,
    })
    if (!result.success) return rejectWithValue(result.error || 'Generate failed')
    const filters = { ...getState().orders.filters, page: 1 }
    dispatch(setOrderFilters(filters))
    void dispatch(fetchOrders(filters))
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
)

export const printOrder = createAsyncThunk(
  'orders/print',
  async (idOrOrder, { rejectWithValue }) => {
    try {
      let order = idOrOrder && typeof idOrOrder === 'object' ? idOrOrder : null
      const id = order?.id || idOrOrder
      if (!order?.lines?.length && id) {
        const result = await apiClient.get(endpoints.orders.detail(id))
        if (!result.success) {
          return rejectWithValue(result.error || 'Failed to load order for PDF')
        }
        order = mapPurchaseOrder(result.data)
      }
      if (!order) return rejectWithValue('Order not found')
      downloadPurchaseOrderPdf(order)
      return { success: true, data: { downloaded: true } }
    } catch (err) {
      return rejectWithValue(err?.message || 'PDF download failed')
    }
  },
)

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrderFilters(state, action) {
      state.filters = action.payload
    },
    patchOrderFilters(state, action) {
      const patch = action.payload || {}
      const next = { ...state.filters, ...patch }
      const resets =
        patch.q !== undefined ||
        patch.supplierId !== undefined ||
        patch.status !== undefined ||
        patch.limit !== undefined
      if (resets && patch.page === undefined) next.page = 1
      state.filters = next
    },
    clearOrderDetail(state) {
      state.selected = null
      state.history = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.pagination = action.payload.pagination
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false
        state.items = []
        state.error = action.payload || action.error.message
      })
      .addCase(loadOrderFormOptions.fulfilled, (state, action) => {
        state.supplierOptions = action.payload.suppliers
        state.productOptions = action.payload.products
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.selected = action.payload.data
      })
      .addCase(fetchOrderHistory.fulfilled, (state, action) => {
        state.history = action.payload.data
      })
      .addCase(generateOrder.pending, (state) => {
        state.mutating = true
      })
      .addCase(generateOrder.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(generateOrder.rejected, (state) => {
        state.mutating = false
      })
  },
})

export const { setOrderFilters, patchOrderFilters, clearOrderDetail } = ordersSlice.actions
export default ordersSlice.reducer
