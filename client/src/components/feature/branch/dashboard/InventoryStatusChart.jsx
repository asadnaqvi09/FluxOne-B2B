import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { BRANCH_DASHBOARD_DUMMY } from '@/data/branchDashboard'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

const CHART_H = 280

const STATUS_COLOR = {
  in_stock: BRAND.purple,
  low: '#f59e0b',
  critical: '#ef4444',
}

function InventoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const pct = row.capacity ? Math.round((row.stock / row.capacity) * 100) : 0
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{row.name}</p>
      <p className="mt-1 text-slate-600">
        {row.stock} / {row.capacity} left ({pct}%)
      </p>
      <p className="capitalize text-slate-400">{String(row.status || '').replace('_', ' ')}</p>
    </div>
  )
}

export function InventoryStatusChart({ inventory, className }) {
  const source =
    Array.isArray(inventory) && inventory.length > 0 ? inventory : BRANCH_DASHBOARD_DUMMY.inventory

  const chartData = source.map((item) => ({
    ...item,
    fill: STATUS_COLOR[item.status] || BRAND.deep,
  }))

  return (
    <SurfaceCard
      className={cn('h-full flex flex-col justify-between', className)}
      bodyClassName="flex-1 flex flex-col justify-center"
      title="Inventory Status"
      description="How much stock remains per item"
      actions={
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR.in_stock }} />
            In stock
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR.low }} />
            Low
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR.critical }} />
            Critical
          </span>
        </div>
      }
    >
      <div className="w-full" style={{ height: CHART_H, minHeight: CHART_H }}>
        <ResponsiveContainer width="100%" height={CHART_H}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-32}
              textAnchor="end"
              height={72}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<InventoryTooltip />} cursor={{ fill: 'rgba(142,35,143,0.06)' }} />
            <Bar dataKey="stock" radius={[8, 8, 0, 0]} barSize={28}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  )
}
