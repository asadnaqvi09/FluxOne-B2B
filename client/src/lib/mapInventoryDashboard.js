export const STOCK_STATUS_META = {
  red: {
    label: 'Critical',
    hint: 'Out of stock or critically low — replenish immediately',
    color: '#ef4444',
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-100',
  },
  yellow: {
    label: 'Low stock',
    hint: 'Below reorder point — plan a purchase soon',
    color: '#f59e0b',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    ring: 'ring-amber-100',
  },
  green: {
    label: 'Healthy',
    hint: 'Stock level is healthy',
    color: '#22c55e',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    ring: 'ring-emerald-100',
  },
}

// Pie slice palette (FluxOne-adjacent, not flat purple-only).
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

export function sourceLabel(source) {
  if (source === 'branch_request') return 'Request from branch manager'
  if (source === 'branch_alert') return 'Alert from branch manager'
  if (source === 'system') return 'System alert'
  return source ? String(source).replace(/_/g, ' ') : 'System alert'
}

export function normalizeAlert(row = {}) {
  const status = String(row.status || 'green').toLowerCase()
  const safeStatus = STOCK_STATUS_META[status] ? status : 'green'
  return {
    id: row.id,
    name: row.name || '—',
    remainingNumber: Number(row.remainingNumber ?? row.remaining_number ?? 0),
    status: safeStatus,
    source: row.source || 'system',
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

// Graph API returns rows: { name, day, quantity }.
// Aggregate by product name → top 10 for pie chart.
export function aggregateStockOutPie(rows = [], limit = 10) {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const totals = new Map()
  for (const row of rows) {
    const name = row.name || 'Unknown'
    const qty = Number(row.quantity ?? 0)
    totals.set(name, (totals.get(name) || 0) + qty)
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

export function normalizeStockGraph(rows) {
  return { items: aggregateStockOutPie(rows) }
}
