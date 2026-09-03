import { useMemo, useState } from 'react'
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
import { TrendingUp, TrendingDown, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { BRANCH_DASHBOARD_DUMMY } from '@/data/branchDashboard'
import { formatCurrency, formatPct } from '@/lib/mapBranchDashboard'
import { Badge } from '@/components/ui/badge'

const CHART_H = 260
const MIX_COLORS = ['#8E238F', '#412283', '#16a34a', '#2563eb', '#ea580c', '#ef4444', '#0d9488', '#db2777']

function ProductTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{row.name}</p>
      <p className="mt-1 text-slate-600">{row.units} units sold</p>
    </div>
  )
}

function buildMixRows(productMix, topProducts, lowProducts) {
  if (Array.isArray(productMix) && productMix.length > 0) {
    return productMix.map((item) => ({
      name: item.name,
      units: Number(item.units ?? item.sales) || 0,
    }))
  }

  const merged = [...(topProducts || []), ...(lowProducts || [])]
  const seen = new Set()
  const fromParts = merged
    .filter((item) => {
      if (!item?.name || seen.has(item.name)) return false
      seen.add(item.name)
      return true
    })
    .map((item) => ({
      name: item.name,
      units: Number(item.units ?? item.sales) || 0,
    }))
    .sort((a, b) => b.units - a.units)

  if (fromParts.length > 0) return fromParts

  return BRANCH_DASHBOARD_DUMMY.productMix.map((item) => ({
    name: item.name,
    units: Number(item.units) || 0,
  }))
}

export function ProductSalesInsights({
  productMix = [],
  topProducts = [],
  lowProducts = [],
  className,
}) {
  const [viewMode, setViewMode] = useState('chart') // 'chart' | 'top' | 'low'

  const rows = useMemo(
    () => buildMixRows(productMix, topProducts, lowProducts),
    [productMix, topProducts, lowProducts],
  )

  const tops =
    Array.isArray(topProducts) && topProducts.length > 0
      ? topProducts
      : BRANCH_DASHBOARD_DUMMY.topProducts

  const lows =
    Array.isArray(lowProducts) && lowProducts.length > 0
      ? lowProducts
      : BRANCH_DASHBOARD_DUMMY.lowProducts

  return (
    <SurfaceCard
      className={className}
      title="Product Sales & Mix"
      description="Higher vs lower volume products & velocity"
      actions={
        <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'chart'
                ? 'bg-white text-purple-950 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mix Chart
          </button>
          <button
            type="button"
            onClick={() => setViewMode('top')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'top'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="size-3 text-emerald-600" />
            Top Higher
          </button>
          <button
            type="button"
            onClick={() => setViewMode('low')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'low'
                ? 'bg-white text-rose-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="size-3 text-rose-600" />
            Lowest Drop
          </button>
        </div>
      }
    >
      {viewMode === 'chart' && (
        <div className="w-full" style={{ height: CHART_H, minHeight: CHART_H }}>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="#e8edf3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 'auto']}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                tickCount={6}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={65}
                tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ProductTooltip />} cursor={{ fill: 'rgba(142,35,143,0.05)' }} />
              <Bar dataKey="units" radius={[0, 6, 6, 0]} barSize={18}>
                {rows.map((entry, index) => (
                  <Cell key={entry.name} fill={MIX_COLORS[index % MIX_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === 'top' && (
        <div className="space-y-3" style={{ minHeight: CHART_H }}>
          <p className="text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-emerald-600" />
            Top products generating highest volume and revenue increases
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {tops.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.units} units sold today</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs sm:text-sm text-slate-900">{formatCurrency(item.sales)}</p>
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-600">
                    {formatPct(item.changePct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'low' && (
        <div className="space-y-3" style={{ minHeight: CHART_H }}>
          <p className="text-xs font-medium text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5">
            <ArrowDownRight className="size-3.5 text-rose-600" />
            Lowest performing products with drop in checkout velocity
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {lows.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-rose-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.units} units sold today</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs sm:text-sm text-slate-900">{formatCurrency(item.sales)}</p>
                  <span className="inline-flex items-center text-[11px] font-bold text-rose-600">
                    {formatPct(item.changePct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SurfaceCard>
  )
}
