import { Monitor } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { BRAND } from '@/lib/constants'
import { formatCurrency } from '@/lib/mapBranchDashboard'
import { cn } from '@/lib/utils'

const COUNTER_COLORS = [BRAND.purple, BRAND.deep, '#2563eb', '#16a34a']

export function CounterSalesCard({ counters = [], className }) {
  const list = Array.isArray(counters) ? counters : []
  const total = list.reduce((sum, c) => sum + (Number(c.sales) || 0), 0)

  const gridCols =
    list.length === 1
      ? 'grid-cols-1'
      : list.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <SurfaceCard
      className={cn('w-full', className)}
      title="POS Counter Sales"
      description="Sales per POS till — uses counter code, or cashier hardware ID when till was not synced"
      actions={
        list.length > 0 ? (
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-900 border border-purple-100">
            {formatCurrency(total)} combined turnover
          </span>
        ) : null
      }
    >
      {list.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="No POS counter sales"
          description="Counter breakdown appears once sales are recorded against POS terminals."
          className="py-10"
        />
      ) : (
        <div className={cn('grid gap-3.5', gridCols)}>
          {list.map((counter, index) => {
            const salesNum = Number(counter.sales) || 0
            const share = total > 0 ? ((salesNum / total) * 100).toFixed(1) : '0.0'
            const barColor = COUNTER_COLORS[index % COUNTER_COLORS.length]

            return (
              <div
                key={counter.id || counter.name}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all hover:bg-slate-50 hover:border-purple-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: BRAND.soft, color: BRAND.deep }}
                    >
                      <Monitor className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{counter.name}</p>
                      <p className="text-xs text-slate-500">{counter.orders} orders processed</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-extrabold text-slate-900">{formatCurrency(salesNum)}</p>
                    <p className="text-xs font-semibold text-purple-700">{share}% share</p>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${share}%`,
                      background: barColor,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SurfaceCard>
  )
}
