import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { BRAND } from '@/lib/constants'

const CHART_H = 260

function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-slate-600">{payload[0].value} sales</p>
      {row?.topItem ? <p className="mt-0.5 text-slate-400">Top: {row.topItem}</p> : null}
    </div>
  )
}

export function SalesChart({ series, className }) {
  const data = Array.isArray(series) ? series : []

  return (
    <SurfaceCard
      className={className}
      title="Today's sales by hour"
      description="When sales increased vs dropped"
    >
      {/* Explicit height — Recharts ResponsiveContainer breaks on flex-1 / % height */}
      <div className="w-full" style={{ height: CHART_H, minHeight: CHART_H }}>
        <ResponsiveContainer width="100%" height={CHART_H}>
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="salesHourFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.purple} stopOpacity={0.28} />
                <stop offset="100%" stopColor={BRAND.purple} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e8edf3" />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              domain={[0, 'auto']}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
              tickCount={9}
            />
            <Tooltip content={<SalesTooltip />} />
            <Area
              type="monotone"
              dataKey="sales"
              stroke={BRAND.purple}
              strokeWidth={2.5}
              fill="url(#salesHourFill)"
              dot={{ r: 4, fill: BRAND.purple, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: BRAND.purple, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  )
}
