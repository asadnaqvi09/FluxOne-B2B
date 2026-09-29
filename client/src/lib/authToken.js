// Decode JWT `exp` without a library (payload only; not verified).
import { formatDateTimeInline } from '@/lib/formatDateTime'

export function getTokenExpiryDate(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    if (!payload?.exp) return null
    return new Date(payload.exp * 1000)
  } catch {
    return null
  }
}

export function formatLoginExpires(date) {
  // Login expiry — always 12h AM/PM via shared helper
  return formatDateTimeInline(date)
}
