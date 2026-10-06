import { ArrowDownLeft, ArrowUpRight, Layers, TriangleAlert } from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/shared/StatsCards'
import { cn } from '@/lib/utils'

// Control KPI strip — Phase 2 chrome (Figma layout guide)
function formatUnits(value) {
  return `${Number(value || 0).toLocaleString()} units`
}

function formatItems(value) {
  const n = Number(value || 0)
  return `${String(n).padStart(2, '0')} items`
}

export function ControlKpiCards({
  summary = null,
  loading = false,
  onAttentionClick,
  className,
}) {
  const s = summary || {}
  const low = Number(s.lowStockCount) || 0
  const out = Number(s.outOfStockCount) || 0
  const productCount = Number(s.productCount) || 0

  const cards = [
    {
      key: 'onHand',
      label: 'Total stock on hand',
      value: loading ? '…' : formatUnits(s.totalStockOnHand),
      subtitle: loading
        ? 'Loading…'
        : `${productCount.toLocaleString()} products & variants`,
      icon: Layers,
    },
    {
      key: 'inToday',
      label: 'Stock in today',
      value: loading ? '…' : formatUnits(s.stockInToday),
      subtitle: 'Received into inventory',
      icon: ArrowDownLeft,
    },
    {
      key: 'outToday',
      label: 'Stock out today',
      value: loading ? '…' : formatUnits(s.stockOutToday),
      subtitle: 'Automatically tracked from sales',
      icon: ArrowUpRight,
    },
    {
      key: 'attention',
      label: 'Items needing attention',
      value: loading ? '…' : formatItems(s.attentionCount),
      subtitle: `${low} low stock · ${out} out of stock`,
      icon: TriangleAlert,
      onClick: onAttentionClick,
    },
  ]

  return (
    <StatsGrid columns={4} className={cn(className)}>
      {cards.map((card, index) => (
        <StatCard
          key={card.key}
          index={index}
          label={card.label}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          onClick={card.onClick}
          className={card.onClick ? undefined : 'cursor-default'}
        />
      ))}
    </StatsGrid>
  )
}

export default ControlKpiCards
