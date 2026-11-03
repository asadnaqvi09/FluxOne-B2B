// Inventory dashboard mappers — KPIs, alerts, stock-graph pie by date

export const STOCK_STATUS_META = {
  red: {
    label: 'Red',
    hint: 'Out of stock or critically low — replenish immediately',
    color: '#ef4444',
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-100',
  },
  yellow: {
    label: 'Yellow',
    hint: 'Below reorder point — plan a purchase soon',
    color: '#f59e0b',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    ring: 'ring-amber-100',
  },
  green: {
    label: 'Green',
    hint: 'Stock level is healthy',
    color: '#22c55e',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    ring: 'ring-emerald-100',
  },
}

// Pie slice palette (FluxOne-adjacent)
export const PIE_COLORS = [
  '#8E238F',
  '#412283',
  '#c026d3',
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#64748b',
  '#a855f7',
]

export const EMPTY_KPIS = {
  totalCategories: 0,
  totalSubCategories: 0,
  totalItems: 0,
}

// TL source wording
export function sourceLabel(source) {
  if (source === 'branch_request') return 'Request from branch manager'
  if (source === 'branch_alert') return 'Alert from branch manager'
  return 'Alert from branch manager'
}

// Normalize API day → YYYY-MM-DD
function toDayKey(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  try {
    return new Date(value).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function normalizeAlert(row = {}) {
  const status = String(row.status || 'green').toLowerCase()
  const safeStatus = STOCK_STATUS_META[status] ? status : 'green'
  return {
    id: row.id,
    name: row.name || '—',
    remainingNumber: Number(row.remainingNumber ?? row.remaining_number ?? 0),
    status: safeStatus,
    source: row.source === 'branch_request' ? 'branch_request' : 'branch_alert',
  }
}

export function normalizeKpis(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_KPIS }
  return {
    totalCategories: Number(raw.totalCategories ?? raw.total_categories ?? 0),
    totalSubCategories: Number(raw.totalSubCategories ?? raw.total_sub_categories ?? 0),
    totalItems: Number(raw.totalItems ?? raw.total_items ?? 0),
  }
}

// Keep day-level rows so the pie can filter by date dropdown
export function normalizeStockGraphRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  return rows
    .map((row) => ({
      name: row.name || 'Unknown',
      day: toDayKey(row.day),
      quantity: Number(row.quantity ?? 0),
    }))
    .filter((row) => row.day && row.quantity > 0)
}

// Unique days, newest first — for "Items by date" dropdown
export function listStockGraphDates(rows = []) {
  const set = new Set()
  for (const row of rows) {
    if (row.day) set.add(row.day)
  }
  return [...set].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
}

// Top N items for one day (or all days when day is empty)
export function aggregateStockOutPie(rows = [], { day = '', limit = 10 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const filtered = day ? rows.filter((row) => row.day === day) : rows
  const totals = new Map()
  for (const row of filtered) {
    const name = row.name || 'Unknown'
    totals.set(name, (totals.get(name) || 0) + Number(row.quantity || 0))
  }

  return [...totals.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit)
}

export function normalizeAlertsPayload(data, { page = 1, limit = 8 } = {}) {
  if (!data) {
    return {
      items: [],
      pagination: { page, limit, total: 0, pageCount: 1 },
    }
  }

  const itemsRaw = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
  const items = itemsRaw.map(normalizeAlert)

  const pagination = data.pagination || {
    page,
    limit,
    total: items.length,
    pageCount: 1,
  }

  return { items, pagination }
}

// Back-compat alias used by older imports
export function normalizeStockGraph(rows) {
  return { items: aggregateStockOutPie(normalizeStockGraphRows(rows)) }
}
