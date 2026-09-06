import { memo } from 'react'
import { Boxes, FolderTree, Layers } from 'lucide-react'
import { StatCard } from '@/components/shared/StatsCards'
import { cn } from '@/lib/utils'

const KPI_META = [
  {
    key: 'totalCategories',
    label: 'Total Categories',
    icon: FolderTree,
    subtitle: 'Active parent categories only',
    badge: 'Catalog',
  },
  {
    key: 'totalSubCategories',
    label: 'Total Sub Categories',
    icon: Layers,
    subtitle: 'Active sub categories under active parents',
    badge: 'Segments',
  },
  {
    key: 'totalItems',
    label: 'Total Products',
    icon: Boxes,
    subtitle: 'Active products — each bundle counts as 1',
    badge: 'Inventory',
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
            subtitle={meta.subtitle}
            badge={meta.badge}
            icon={Icon}
          />
        )
      })}
    </div>
  )
}

export const InventoryKpiCards = memo(InventoryKpiCardsComponent)
export default InventoryKpiCards
