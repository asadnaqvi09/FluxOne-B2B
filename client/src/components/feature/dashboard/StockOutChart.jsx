import { memo, useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { NativeSelect } from '@/components/ui/select'
import { ChartSkeleton } from '@/components/ui/skeleton'
import {
  aggregateStockOutPie,
  listStockGraphDates,
  PIE_COLORS,
} from '@/lib/mapInventoryDashboard'
import { cn } from '@/lib/utils'

const CHART_H = 280
const TOP_N = 10

function formatDayLabel(day) {
  if (!day) return 'All dates'
  try {
    return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return day
  }
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{row.name}</p>
      <p className="mt-1 text-slate-600">
        Stock out · <span className="font-bold tabular-nums">{row.quantity}</span> units
      </p>
      {row.percent != null ? (
        <p className="mt-0.5 text-slate-400">{row.percent}% of top movers</p>
      ) : null}
    </div>
  )
}

function buildChartData(items = []) {
  const total = items.reduce((sum, row) => sum + Number(row.quantity || 0), 0) || 1
  return items.map((row, index) => {
    const quantity = Number(row.quantity || 0)
    return {
      name: row.name,
      quantity,
      percent: Math.round((quantity / total) * 100),
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }
  })
}

function StockOutChartComponent({ rows = [], loading = false, className }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [selectedDay, setSelectedDay] = useState('')

  const dates = useMemo(() => listStockGraphDates(rows), [rows])

  // Default to newest day when data loads / changes
  useEffect(() => {
    if (!dates.length) {
      setSelectedDay('')
      return
    }
    setSelectedDay((prev) => (prev && dates.includes(prev) ? prev : dates[0]))
  }, [dates])

  const pieItems = useMemo(
    () => aggregateStockOutPie(rows, { day: selectedDay, limit: TOP_N }),
    [rows, selectedDay],
  )
  const chartData = useMemo(() => buildChartData(pieItems), [pieItems])
  const isEmpty = !loading && chartData.length === 0

  return (
    <SurfaceCard
      className={cn(
        'cursor-pointer transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(65,34,131,0.1)]',
        className,
      )}
      title="Stock Graph"
      description="Most out-of-stock items — top 10 by selected date"
      actions={
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="stock-graph-day" className="shrink-0 text-xs font-medium text-slate-500">
            Items by date
          </label>
          <NativeSelect
            id="stock-graph-day"
            value={selectedDay}
            disabled={loading || dates.length === 0}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="h-8 max-w-[10.5rem] text-xs"
          >
            {dates.length === 0 ? (
              <option value="">No dates</option>
            ) : (
              dates.map((day) => (
                <option key={day} value={day}>
                  {formatDayLabel(day)}
                </option>
              ))
            )}
          </NativeSelect>
        </div>
      }
    >
      {loading ? (
        <ChartSkeleton />
      ) : isEmpty ? (
        <EmptyState
          compact
          className="h-[280px] border-0 bg-transparent"
          title="No stock-out activity yet"
          description="Sales, damaged, and expired movements will show the top movers here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="w-full overflow-hidden" style={{ height: CHART_H, minHeight: CHART_H }}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="quantity"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={96}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      opacity={activeIndex == null || activeIndex === index ? 1 : 0.45}
                      style={{
                        transform: activeIndex === index ? 'scale(1.03)' : 'scale(1)',
                        transformOrigin: 'center',
                        transition: 'opacity 160ms ease, transform 160ms ease',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="grid grid-cols-1 gap-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-1">
            {chartData.map((row, index) => (
              <li key={row.name}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                    activeIndex === index ? 'bg-slate-100' : 'hover:bg-slate-50',
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: row.fill }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                    {row.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">{row.quantity}</span>
                  <span className="w-9 shrink-0 text-right tabular-nums text-slate-400">
                    {row.percent}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SurfaceCard>
  )
}

export const StockOutChart = memo(StockOutChartComponent)
