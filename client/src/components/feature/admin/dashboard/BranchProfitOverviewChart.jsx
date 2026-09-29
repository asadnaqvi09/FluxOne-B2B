import { useMemo } from 'react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  Area,
} from 'recharts'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { BRAND } from '@/lib/constants'

// Short axis labels for monthly profit values
function formatShortCurrency(value) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `Rs. ${(n / 1000).toFixed(0)}k`
  return `Rs. ${n}`
}

// Monthly net-profit chart — scoped by page-header Branch + Date filters (via API data)
export function BranchProfitOverviewChart({ data = {}, branchId = 'all', branchName = null }) {
  // API already returns profit for the selected branch (or consolidated when "all")
  const chartRows = useMemo(() => {
    return (data.monthlyData || []).map((row) => ({
      month: row.month,
      profit: Number(row.profit) || 0,
    }))
  }, [data.monthlyData])

  const year = data.year || new Date().getFullYear()
  const scopeLabel =
    branchId && branchId !== 'all'
      ? branchName || 'Selected branch'
      : 'All branches'

  return (
    <SurfaceCard
      title="Branch Overview"
      description={`Monthly net profit for ${year} · ${scopeLabel}`}
    >
      <div className="h-72 w-full pt-1">
        {!chartRows.length ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No sales data for this period yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
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
                dataKey="profit"
                name="Net Profit"
                stroke={BRAND.purple}
                strokeWidth={3}
                fill="url(#profitGradRich)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </SurfaceCard>
  )
}

export default BranchProfitOverviewChart
