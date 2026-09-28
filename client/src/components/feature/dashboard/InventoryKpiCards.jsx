import { memo } from 'react'
import { Boxes, FolderTree, Layers } from 'lucide-react'
import { StatCard } from '@/components/shared/StatsCards'
import { cn } from '@/lib/utils'

// TL Inventory Overview KPIs
const KPI_META = [
  {
    key: 'totalCategories',
    label: 'Total Categories',
    icon: FolderTree,
  },
  {
    key: 'totalSubCategories',
    label: 'Total subcategories',
    icon: Layers,
  },
  {
    key: 'totalItems',
    label: 'Total items',
    icon: Boxes,
  },
]

function formatCount(value) {
  return Number(value || 0).toLocaleString()
}

function InventoryKpiCardsComponent({ kpis = {}, loading = false, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-3', className)}>
      {KPI_META.map((meta, index) => {
        const Icon = meta.icon
        return (
          <StatCard
            key={meta.key}
            index={index}
            label={meta.label}
            value={loading ? '...' : formatCount(kpis[meta.key])}
            icon={Icon}
          />
        )
      })}
    </div>
  )
}

export const InventoryKpiCards = memo(InventoryKpiCardsComponent)
export default InventoryKpiCards
