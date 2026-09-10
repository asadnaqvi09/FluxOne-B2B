import { cn } from '@/lib/utils'

// Shared mobile/desktop split used across list UIs:
// - mobile: card stack (md:hidden)
// - desktop: scrollable table (hidden md:block)
export function ResponsiveDataShell({ mobile, desktop, className }) {
  return (
    <>
      <div className={cn('space-y-3 md:hidden', className)}>{mobile}</div>
      <div className={cn('hidden overflow-x-auto md:block', className)}>{desktop}</div>
    </>
  )
}

export function DataCard({ children, className, as: Comp = 'article' }) {
  return (
    <Comp className={cn('rounded-xl border border-border bg-slate-50/60 px-3 py-3', className)}>
      {children}
    </Comp>
  )
}
