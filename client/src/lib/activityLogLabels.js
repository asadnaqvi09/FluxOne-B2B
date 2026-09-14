/** Known activity action slugs → human labels (POS first; BM/IM grow later). */
export const ACTIVITY_ACTION_LABELS = Object.freeze({
  login: 'Login',
  logout: 'Logout',
  open_cash_drawer: 'Open cash drawer',
  close_cash_drawer: 'Close cash drawer',
  price_change: 'Price change',
  change_cashier: 'Change cashier',
})

export const ACTIVITY_SOURCES = Object.freeze([
  { value: 'pos', label: 'POS' },
  { value: 'bm', label: 'Branch Manager' },
  { value: 'im', label: 'Inventory' },
  { value: 'system', label: 'System' },
])

export function titleCaseSlug(slug) {
  return String(slug || '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function activityActionLabel(action) {
  const slug = String(action || '').trim()
  if (!slug) return 'Unknown action'
  return ACTIVITY_ACTION_LABELS[slug] || titleCaseSlug(slug)
}

export function activitySourceLabel(source) {
  const found = ACTIVITY_SOURCES.find((s) => s.value === source)
  return found?.label || titleCaseSlug(source) || 'Unknown'
}

/** Prefer server message; else "{actorName} performed {actionLabel}". */
export function formatActivityLine(log) {
  if (log?.message && String(log.message).trim()) return String(log.message).trim()
  const name = String(log?.actorName || 'Someone').trim() || 'Someone'
  return `${name} performed ${activityActionLabel(log?.action)}`
}

export function formatActivityTime(value) {
  if (!value) return '—'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    const diffMs = Date.now() - date.getTime()
    const absMs = Math.abs(diffMs)
    const minutes = Math.floor(absMs / 60000)
    if (minutes < 1) return diffMs >= 0 ? 'Just now' : 'In a moment'
    if (minutes < 60) return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return diffMs >= 0 ? `${days}d ago` : `in ${days}d`

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}
