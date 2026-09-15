import { cn } from '@/lib/utils'

//True when status string or boolean represents an active/open entity.
export function isEntityActive(value) {
  if (typeof value === 'boolean') return value
  const status = String(value || '').toLowerCase()
  return status !== 'inactive' && status !== 'blocked' && status !== 'close'
}

//
// Unified Active / Inactive pill used across staff, products, categories, suppliers.
// onChange receives the next boolean (true = activate).
//
export function EntityStatusToggle({
  active,
  status,
  loading = false,
  onChange,
  className,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  activeTitle = 'Click to deactivate',
  inactiveTitle = 'Click to activate',
}) {
  const isActive = active != null ? Boolean(active) : isEntityActive(status)

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onChange?.(!isActive)}
      className={cn(
        'inline-flex cursor-pointer items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-opacity disabled:cursor-not-allowed disabled:opacity-60',
        isActive
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200',
        className,
      )}
      title={isActive ? activeTitle : inactiveTitle}
    >
      <span
        className="mr-1.5 size-1.5 rounded-full"
        style={{ background: isActive ? '#22c55e' : '#94a3b8' }}
      />
      {isActive ? activeLabel : inactiveLabel}
      {loading ? '…' : ''}
    </button>
  )
}
