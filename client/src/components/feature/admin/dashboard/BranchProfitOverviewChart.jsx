import { useMemo, useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  Area,
} from 'recharts'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { NativeSelect } from '@/components/ui/select'
import { BRAND } from '@/lib/constants'
import { TrendingUp, DollarSign, Trophy } from 'lucide-react'

const PALETTE = ['#8E238F', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6']

function formatShortCurrency(value) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `Rs. ${(n / 1000).toFixed(0)}k`
  return `Rs. ${n}`
}

function profitKey(branchId) {
  return `profit__${branchId}`
}

export function BranchProfitOverviewChart({ data = {} }) {
  const branches = useMemo(
    () => (data.branches || []).filter((b) => b.id && b.id !== 'all'),
    [data.branches],
  )
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [viewMetric, setViewMetric] = useState('profit')

  useEffect(() => {
    if (selectedBranch !== 'all' && !branches.some((b) => b.id === selectedBranch)) {
      setSelectedBranch('all')
    }
  }, [branches, selectedBranch])

  const chartRows = useMemo(() => {
    return (data.monthlyData || []).map((row) => {
      const flat = {
        month: row.month,
        revenue: Number(row.revenue) || 0,
        profit: Number(row.profit) || 0,
        marginPct: Number(row.marginPct) || 0,
      }
      for (const b of row.branches || []) {
        flat[profitKey(b.branchId)] = Number(b.profit) || 0
      }
      return flat
    })
  }, [data.monthlyData])

  const summary = data.summary || {}
  const year = data.year || new Date().getFullYear()
  const areaKey =
    selectedBranch === 'all' ? 'profit' : profitKey(selectedBranch)

  const branchOptions = [
    { id: 'all', name: 'All Branches (Consolidated)' },
    ...branches,
  ]

  return (
    <SurfaceCard
      title="Branch Profit & Revenue Overview"
      description={`Monthly profit and revenue for ${year}`}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMetric('profit')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMetric === 'profit'
                  ? 'bg-white font-bold text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Net Profit
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('revenue')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMetric === 'revenue'
                  ? 'bg-white font-bold text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenue vs Profit
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('comparison')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMetric === 'comparison'
                  ? 'bg-white font-bold text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Branches
            </button>
          </div>

          <div className="w-44">
            <NativeSelect
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-8.5 bg-white py-0 text-xs font-medium"
            >
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 pt-1">
        <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50/80 px-3 py-1.5 text-xs font-semibold text-purple-950">
          <DollarSign className="size-3.5 text-purple-600" />
          <span>
            Total {year} Profit:{' '}
            <strong>{summary.totalProfitFormatted || 'Rs. 0'}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-950">
          <TrendingUp className="size-3.5 text-emerald-600" />
          <span>
            Avg Margin: <strong>{summary.avgMarginPct ?? 0}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-950">
          <Trophy className="size-3.5 text-amber-600" />
          <span>
            Top Branch: <strong>{summary.topBranch?.name || '—'}</strong>
          </span>
        </div>
      </div>

      <div className="h-72 w-full pt-1">
        {!chartRows.length ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No sales data for this period yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMetric === 'comparison' ? (
              <BarChart data={chartRows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={formatShortCurrency}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val, name) => {
                    const id = String(name).replace(/^profit__/, '')
                    const label = branches.find((b) => b.id === id)?.name || name
                    return [`Rs. ${Number(val).toLocaleString()}`, label]
                  }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(val) => {
                    const id = String(val).replace(/^profit__/, '')
                    return branches.find((b) => b.id === id)?.name || val
                  }}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
                {branches.map((b, i) => (
                  <Bar
                    key={b.id}
                    dataKey={profitKey(b.id)}
                    fill={PALETTE[i % PALETTE.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : viewMetric === 'revenue' ? (
              <ComposedChart data={chartRows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={formatShortCurrency}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val, name) => [
                    `Rs. ${Number(val).toLocaleString()}`,
                    name === 'revenue' ? 'Gross Revenue' : 'Net Profit',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Gross Revenue" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Net Profit" fill={BRAND.purple} radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit Trend"
                  stroke="#412283"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#412283' }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart data={chartRows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGradRich" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND.purple} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={BRAND.purple} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={formatShortCurrency}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val) => [`Rs. ${Number(val).toLocaleString()}`, 'Net Profit']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={areaKey}
                  name="Net Profit"
                  stroke={BRAND.purple}
                  strokeWidth={3}
                  fill="url(#profitGradRich)"
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </SurfaceCard>
  )
}

export default BranchProfitOverviewChart
