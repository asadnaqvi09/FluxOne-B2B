import { useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  DEFAULT_CURRENCY,
  formatMoney,
  getCurrencyMeta,
  normalizeCurrency,
} from '@/lib/currency'

// Reads tenant default currency from the authenticated user session
export function useCurrency() {
  const { user } = useAuth()
  const code = normalizeCurrency(user?.defaultCurrency || DEFAULT_CURRENCY)
  const meta = useMemo(() => getCurrencyMeta(code), [code])

  const format = useCallback((amount) => formatMoney(amount, code), [code])

  return {
    currency: code,
    symbol: meta.symbol,
    label: meta.label,
    format,
  }
}
