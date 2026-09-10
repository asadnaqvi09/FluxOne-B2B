import {
  CircleDollarSign,
  CalendarCheck,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import { StatCard } from '@/components/shared/StatsCards'
import { cn } from '@/lib/utils'

const KPI_CONFIG = [
  {
    key: 'todayEarning',
    title: 'Today Earning',
    subtitle: 'Selected day',
    icon: CircleDollarSign,
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    iconGradient: 'from-purple-600 to-indigo-700',
  },
  {
    key: 'lastMonthEarning',
    title: 'Last Month Earning',
    subtitle: 'Closed calendar month',
    icon: CalendarCheck,
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    iconGradient: 'from-blue-600 to-cyan-600',
  },
  {
    key: 'thisYearEarning',
    title: 'This Year Earning',
    subtitle: 'Year to date',
    icon: TrendingUp,
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    iconGradient: 'from-emerald-600 to-teal-700',
  },
  {
    key: 'totalSale',
    title: 'Total Sale',
    subtitle: 'All-time through date',
    icon: Receipt,
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    iconGradient: 'from-amber-500 to-orange-600',
  },
]

export function AdminKpiCards({ kpis = {}, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {KPI_CONFIG.map((config, index) => {
        const item = kpis[config.key] || {}
        const isUp = item.isPositive ?? true
        const displayValue = item.formatted || 'Rs. 0'
        const changeLabel =
          item.changePct !== undefined && item.changePct !== null
            ? `${item.changePct >= 0 ? '+' : ''}${item.changePct}%`
            : '—'
        const progress =
          item.targetProgressPct != null
            ? Math.min(
                100,
                Math.max(0, Number(item.targetProgressPct) || (item.value > 0 ? 100 : 0)),
              )
            : null
        const footerLeft =
          item.sublabel ||
          (config.key === 'totalSale' && item.formattedTransactions
            ? item.formattedTransactions
            : config.subtitle)

        return (
          <StatCard
            key={config.key}
            index={index}
            label={config.title}
            value={displayValue}
            icon={config.icon}
            gradient={config.gradient}
            iconGradient={config.iconGradient}
            trend={changeLabel}
            isUp={isUp}
            trendText={item.comparisonText || config.subtitle}
            footer={footerLeft}
            progress={progress}
          />
        )
      })}
    </div>
  )
}

export default AdminKpiCards
