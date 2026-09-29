import { cn } from '@/lib/utils'

/**
 * Category on top · Sub category below (system-wide table cell rule).
 * Use whenever both share one column / card row.
 */
export function CategoryLines({
  category,
  subcategory,
  className = '',
  categoryClassName = 'font-medium text-slate-800',
  subcategoryClassName = 'text-[11px] text-slate-500',
  emptyLabel = 'Uncategorized',
}) {
  const cat = category != null && String(category).trim() ? String(category).trim() : ''
  const sub = subcategory != null && String(subcategory).trim() ? String(subcategory).trim() : ''

  if (!cat && !sub) {
    return <span className={cn('text-slate-400', className)}>{emptyLabel}</span>
  }

  return (
    <span className={cn('inline-flex flex-col leading-tight', className)}>
      <span className={categoryClassName}>{cat || emptyLabel}</span>
      {sub ? <span className={subcategoryClassName}>{sub}</span> : null}
    </span>
  )
}

export default CategoryLines
