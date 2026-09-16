import { StatCard } from '@/components/shared/StatsCards'
import {
  Banknote,
  CircleDollarSign,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/mapBranchDashboard'
import { cn } from '@/lib/utils'

const KPI_META = [
  {
    key: 'totalSales',
    label: 'Total Sales',
    subtitle: 'Daily branch turnover',
    icon: CircleDollarSign,
    format: formatCurrency,
  },
  {
    key: 'profit',
    label: 'Gross Profit',
    subtitle: 'Net margin earnings today',
    icon: TrendingUp,
    format: formatCurrency,
  },
  {
    key: 'saleCount',
    label: 'Transactions',
    subtitle: 'POS checkouts processed',
    icon: Receipt,
    format: (n) => Number(n || 0).toLocaleString(),
  },
  {
    key: 'avgTicket',
    label: 'Average Ticket',
    subtitle: 'Average basket size per order',
    icon: Banknote,
    format: formatCurrency,
  },
]

export function BranchKpiCards({ kpis = {}, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4', className)}>
      {KPI_META.map((meta, index) => {
        const Icon = meta.icon
        const value = kpis[meta.key]

        return (
          <StatCard
            key={meta.key}
            index={index}
            label={meta.label}
            value={meta.format(value)}
            subtitle={meta.subtitle}
            icon={Icon}
          />
        )
      })}
    </div>
  )
}

export default BranchKpiCards

