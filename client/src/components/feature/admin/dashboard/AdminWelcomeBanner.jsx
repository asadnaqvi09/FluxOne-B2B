import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { useAuthSession } from '@/hooks/useAuthSession'

const STORAGE_KEY = 'fluxone.admin.welcomeSeen'

export function AdminWelcomeBanner({ className }) {
  const { user } = useAuthSession()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') return
    setVisible(true)
  }, [])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  const company = user?.tenantName || 'SoftwareFlux'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5 ${className || ''}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">
            B2B Enterprise Admin
          </p>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            Welcome to &ldquo;{company}&rdquo; Admin Dashboard
          </h2>
          <p className="text-sm text-slate-600">
            Consolidated multi-branch financial metrics, live inventory monitoring, and AI
            predictive insights across all branches.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss welcome"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
export default AdminWelcomeBanner
