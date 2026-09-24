import { RotateCcw, Search } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { SCALE_OPTIONS } from '@/lib/mapProduct'
import { useItemScales } from '@/hooks/useItemScales'
import { cn } from '@/lib/utils'

// Control movement filters: Search -> Category -> Sub-category -> Type -> Scale -> Reset
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

  const hasActiveFilters = Boolean(
    q || type || scale || categoryId || subcategoryId,
  )

  const handleReset = () => {
    onSearchChange?.('')
    onChange?.({
      q: '',
      type: '',
      scale: '',
      categoryId: '',
      subcategoryId: '',
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      <SurfaceCard padding="compact">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {/* 1. Search */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="control-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="control-search"
                value={q}
                placeholder="Search by name, item code or barcode…"
                className="pl-9"
                onChange={(event) => onSearchChange?.(event.target.value)}
              />
            </div>
          </div>

          {/* 2. Category */}
          <div className="w-full space-y-1.5 sm:w-44 lg:w-48">
            <Label htmlFor="control-category-filter">Category</Label>
            <NativeSelect
              id="control-category-filter"
              value={categoryId}
              onChange={(event) => {
                const nextCategory = event.target.value
                onChange?.({ categoryId: nextCategory, subcategoryId: '' })
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* 3. Sub-category (Dependent on Category) */}
          <div className="w-full space-y-1.5 sm:w-44 lg:w-48">
            <Label htmlFor="control-subcategory-filter">Sub-category</Label>
            <NativeSelect
              id="control-subcategory-filter"
              value={subcategoryId}
              disabled={!categoryId || subcategories.length === 0}
              onChange={(event) => onChange?.({ subcategoryId: event.target.value })}
            >
              <option value="">
                {!categoryId
                  ? 'All Sub-categories'
                  : subcategories.length === 0
                    ? 'No Sub-categories'
                    : 'All Sub-categories'}
              </option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* 4. Type */}
          <div className="w-full space-y-1.5 sm:w-36">
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

          {/* 5. Scale */}
          <div className="w-full space-y-1.5 sm:w-36">
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

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="shrink-0 pb-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3 text-xs text-slate-600 hover:text-slate-900 border-slate-200 cursor-pointer"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}

export default MovementFilters
