import { Search } from 'lucide-react'
import { CategoryThumb, FilterChip } from '@/components/shared/FilterChip'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import { SCALE_OPTIONS } from '@/lib/mapProduct'
import { useItemScales } from '@/hooks/useItemScales'
import { cn } from '@/lib/utils'

// Shared Control filters: search, type, scale, category / subcategory chips
export function MovementFilters({
  q = '',
  type = '',
  scale = '',
  categoryId = '',
  subcategoryId = '',
  categories = [],
  subcategories = [],
  onSearchChange,
  onChange,
  className,
}) {
  const { scales } = useItemScales()
  const scaleChoices = scales.length > 0 ? scales : SCALE_OPTIONS

  return (
    <div className={cn('space-y-4', className)}>
      <SurfaceCard padding="compact">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="control-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="control-search"
                value={q}
                placeholder="Search by name or item code…"
                className="pl-9"
                onChange={(event) => onSearchChange?.(event.target.value)}
              />
            </div>
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor="control-type-filter">Type</Label>
            <NativeSelect
              id="control-type-filter"
              value={type}
              onChange={(event) => onChange?.({ type: event.target.value })}
            >
              <option value="">All Types</option>
              <option value="single">Single</option>
              <option value="bundle">Bundle</option>
            </NativeSelect>
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor="control-scale-filter">Scale</Label>
            <NativeSelect
              id="control-scale-filter"
              value={scale}
              onChange={(event) => onChange?.({ scale: event.target.value })}
            >
              <option value="">All scales</option>
              {scaleChoices.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: BRAND.purple }}>
          Categories
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
              onClick={() => onChange?.({ categoryId: cat.id, subcategoryId: '' })}
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
            <FilterChip active={!subcategoryId} onClick={() => onChange?.({ subcategoryId: '' })}>
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
