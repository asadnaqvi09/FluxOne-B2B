import { Search } from 'lucide-react'
import { CategoryThumb, FilterChip } from '@/components/shared/FilterChip'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Search + type select + category / subcategory chips (POS-style)
export function ProductFilters({
  q = '',
  type = '',
  status = 'active',
  categoryId = '',
  subcategoryId = '',
  categories = [],
  subcategories = [],
  onSearchChange,
  onChange,
  className,
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <SurfaceCard padding="compact">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="product-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="product-search"
                value={q}
                placeholder="Search name, code or barcode..."
                className="pl-9"
                onChange={(event) => onSearchChange?.(event.target.value)}
              />
            </div>
          </div>
          <div className="w-full space-y-1.5 sm:w-44">
            <Label htmlFor="product-type-filter">Type</Label>
            <NativeSelect
              id="product-type-filter"
              value={type}
              onChange={(event) => onChange?.({ type: event.target.value })}
            >
              <option value="">All Types</option>
              <option value="single">Single Item</option>
              <option value="bundle">Bundle</option>
            </NativeSelect>
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor="product-status-filter">Status</Label>
            <NativeSelect
              id="product-status-filter"
              value={status}
              onChange={(event) => onChange?.({ status: event.target.value, page: 1 })}
            >
              <option value="active">Open</option>
              <option value="inactive">Close</option>
              <option value="all">All</option>
            </NativeSelect>
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: BRAND.purple }}>
          All categories
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={!categoryId}
            onClick={() => onChange?.({ categoryId: '', subcategoryId: '' })}
          >
            All
          </FilterChip>
          {categories.map((cat) => (
            <FilterChip
              key={cat.id}
              active={categoryId === cat.id}
              onClick={() =>
                onChange?.({
                  categoryId: cat.id,
                  subcategoryId: '',
                })
              }
            >
              <CategoryThumb category={cat} />
              {cat.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {categoryId && subcategories.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Sub categories
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!subcategoryId}
              onClick={() => onChange?.({ subcategoryId: '' })}
            >
              All in category
            </FilterChip>
            {subcategories.map((sub) => (
              <FilterChip
                key={sub.id}
                active={subcategoryId === sub.id}
                onClick={() => onChange?.({ subcategoryId: sub.id })}
              >
                <CategoryThumb category={sub} />
                {sub.name}
              </FilterChip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
