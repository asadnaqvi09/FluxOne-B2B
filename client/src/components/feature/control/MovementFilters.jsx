import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import {
  fetchControlProductDetail,
  fetchControlProductOptions,
} from '@/hooks/useInventoryControl'
import { cn } from '@/lib/utils'

// Build type → values map from a variant product's combination parts.
function deriveVariantAxes(variants = []) {
  const typeMap = new Map()
  for (const variant of variants) {
    for (const part of variant.parts || []) {
      const typeId = part.variantTypeId || part.typeId
      if (!typeId) continue
      if (!typeMap.has(typeId)) {
        typeMap.set(typeId, {
          id: typeId,
          name: part.typeName || 'Variant type',
          values: new Map(),
        })
      }
      const bucket = typeMap.get(typeId)
      const valueId = part.variantValueId || part.valueId
      if (valueId && !bucket.values.has(valueId)) {
        bucket.values.set(valueId, {
          id: valueId,
          name: part.valueName || 'Value',
        })
      }
    }
  }
  return [...typeMap.values()].map((type) => ({
    id: type.id,
    name: type.name,
    values: [...type.values.values()],
  }))
}

// Reusable labeled filter select — stays visible; disable when cascade not ready.
function FilterSelect({
  id,
  label,
  value,
  disabled = false,
  placeholder,
  options = [],
  onChange,
  className,
}) {
  return (
    <div className={cn('w-full space-y-1.5 sm:w-44 lg:w-48', className)}>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

// Control filter bar — always-visible cascade; disabled until prior step unlocks.
// Order: Search → Category → Sub → Product → Variant → Type → Value → Dates → Type → Reset
export function MovementFilters({
  q = '',
  type = '',
  categoryId = '',
  subcategoryId = '',
  productId = '',
  variantId = '',
  variantTypeId = '',
  variantValueId = '',
  from = '',
  to = '',
  categories = [],
  subcategories = [],
  onSearchChange,
  onChange,
  className,
}) {
  const [products, setProducts] = useState([])
  const [variantOptions, setVariantOptions] = useState([])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  )

  const isVariantProduct = selectedProduct?.type === PRODUCT_TYPES.VARIANT
  const hasSubcategories = Boolean(categoryId) && subcategories.length > 0

  // Sub: viewable always; clickable only when category has children.
  const subEnabled = hasSubcategories

  // Product: after category; if subs exist, require a subcategory first.
  const productEnabled =
    Boolean(categoryId) && (!hasSubcategories || Boolean(subcategoryId))

  const variantAxes = useMemo(
    () => deriveVariantAxes(variantOptions),
    [variantOptions],
  )

  const selectedTypeValues = useMemo(() => {
    const axis = variantAxes.find((t) => t.id === variantTypeId)
    return axis?.values || []
  }, [variantAxes, variantTypeId])

  // Combination / type / value unlock only for variant products with data.
  const variantComboEnabled = Boolean(productId) && isVariantProduct && variantOptions.length > 0
  const variantTypeEnabled = Boolean(productId) && isVariantProduct && variantAxes.length > 0
  const variantValueEnabled =
    variantTypeEnabled && Boolean(variantTypeId) && selectedTypeValues.length > 0

  const hasActiveFilters = Boolean(
    q ||
      type ||
      categoryId ||
      subcategoryId ||
      productId ||
      variantId ||
      variantTypeId ||
      variantValueId ||
      from ||
      to,
  )

  // Load products when category / subcategory cascade is ready.
  useEffect(() => {
    let cancelled = false

    if (!productEnabled) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setProducts([])
        if (productId || variantId || variantTypeId || variantValueId) {
          onChange?.({
            productId: '',
            variantId: '',
            variantTypeId: '',
            variantValueId: '',
          })
        }
      })
      return () => {
        cancelled = true
      }
    }

    void fetchControlProductOptions({
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      limit: 100,
    }).then((res) => {
      if (cancelled) return
      const items = res.success ? res.items : []
      setProducts(items)
      if (productId && !items.some((p) => p.id === productId)) {
        onChange?.({
          productId: '',
          variantId: '',
          variantTypeId: '',
          variantValueId: '',
        })
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cascade-driven reload
  }, [categoryId, subcategoryId, productEnabled])

  // Load variant combinations when a variant parent is selected.
  useEffect(() => {
    let cancelled = false

    // No product → clear variant cascade.
    if (!productId) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setVariantOptions([])
        if (variantId || variantTypeId || variantValueId) {
          onChange?.({ variantId: '', variantTypeId: '', variantValueId: '' })
        }
      })
      return () => {
        cancelled = true
      }
    }

    // Wait for product options to resolve before treating as non-variant.
    if (!selectedProduct) {
      return () => {
        cancelled = true
      }
    }

    if (!isVariantProduct) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setVariantOptions([])
        if (variantId || variantTypeId || variantValueId) {
          onChange?.({ variantId: '', variantTypeId: '', variantValueId: '' })
        }
      })
      return () => {
        cancelled = true
      }
    }

    void fetchControlProductDetail(productId).then((res) => {
      if (cancelled) return
      if (!res.success) {
        setVariantOptions([])
        return
      }
      const variants = Array.isArray(res.data?.variants) ? res.data.variants : []
      setVariantOptions(variants)
      if (variantId && !variants.some((v) => v.id === variantId)) {
        onChange?.({ variantId: '' })
      }
      // Drop stale type/value if they no longer exist on this product.
      const axes = deriveVariantAxes(variants)
      const typeOk = !variantTypeId || axes.some((t) => t.id === variantTypeId)
      const values = axes.find((t) => t.id === variantTypeId)?.values || []
      const valueOk = !variantValueId || values.some((v) => v.id === variantValueId)
      if (!typeOk || !valueOk) {
        onChange?.({
          ...(typeOk ? {} : { variantTypeId: '', variantValueId: '' }),
          ...(typeOk && !valueOk ? { variantValueId: '' } : {}),
        })
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tied to selected product
  }, [productId, isVariantProduct, selectedProduct])

  const handleReset = () => {
    onSearchChange?.('')
    onChange?.({
      q: '',
      type: '',
      categoryId: '',
      subcategoryId: '',
      productId: '',
      variantId: '',
      variantTypeId: '',
      variantValueId: '',
      from: '',
      to: '',
      scale: '',
    })
  }

  function patch(next) {
    onChange?.(next)
  }

  const categoryOptions = categories.map((cat) => ({ id: cat.id, label: cat.name }))
  const subcategoryOptions = subcategories.map((sub) => ({ id: sub.id, label: sub.name }))
  const productOptions = products.map((product) => ({
    id: product.id,
    label: product.itemCode ? `${product.name} (${product.itemCode})` : product.name,
  }))
  const combinationOptions = variantOptions.map((variant) => ({
    id: variant.id,
    label: variant.variantLabel || variant.label || variant.scale || variant.id,
  }))
  const typeAxisOptions = variantAxes.map((axis) => ({ id: axis.id, label: axis.name }))
  const valueAxisOptions = selectedTypeValues.map((value) => ({
    id: value.id,
    label: value.name,
  }))

  const subPlaceholder = !categoryId
    ? 'Select category first'
    : !hasSubcategories
      ? 'No sub-categories'
      : 'All Sub-categories'

  const productPlaceholder = !categoryId
    ? 'Select category first'
    : hasSubcategories && !subcategoryId
      ? 'Select sub-category first'
      : 'All Products'

  const variantPlaceholder = !productId
    ? 'Select product first'
    : !isVariantProduct
      ? 'Not a variant product'
      : variantOptions.length === 0
        ? 'No combinations'
        : 'All variants'

  const variantTypePlaceholder = !productId
    ? 'Select product first'
    : !isVariantProduct
      ? 'Not a variant product'
      : variantAxes.length === 0
        ? 'No variant types'
        : 'All variant types'

  const variantValuePlaceholder = !variantTypeId
    ? 'Select variant type first'
    : selectedTypeValues.length === 0
      ? 'No values'
      : 'All values'

  return (
    <div className={cn('space-y-4', className)}>
      <SurfaceCard
        padding="compact"
        title="Filter your inventory"
        description="Filters apply across all tabs."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
            {/* 1. Search */}
            <div className="min-w-0 flex-1 space-y-1.5 basis-full sm:basis-64">
              <Label htmlFor="control-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="control-search"
                  value={q}
                  placeholder="Search name, code, barcode…"
                  className="pl-9"
                  onChange={(event) => onSearchChange?.(event.target.value)}
                />
              </div>
            </div>

            {/* 2. Category */}
            <FilterSelect
              id="control-category-filter"
              label="Category"
              value={categoryId}
              placeholder="All Categories"
              options={categoryOptions}
              onChange={(next) =>
                patch({
                  categoryId: next,
                  subcategoryId: '',
                  productId: '',
                  variantId: '',
                  variantTypeId: '',
                  variantValueId: '',
                })
              }
            />

            {/* 3. Sub-category — always visible; enabled only when category has children */}
            <FilterSelect
              id="control-subcategory-filter"
              label="Sub-category"
              value={subcategoryId}
              disabled={!subEnabled}
              placeholder={subPlaceholder}
              options={subcategoryOptions}
              onChange={(next) =>
                patch({
                  subcategoryId: next,
                  productId: '',
                  variantId: '',
                  variantTypeId: '',
                  variantValueId: '',
                })
              }
            />

            {/* 4. Product — populated from category / sub-category */}
            <FilterSelect
              id="control-product-filter"
              label="Product"
              value={productId}
              disabled={!productEnabled}
              placeholder={productPlaceholder}
              options={productOptions}
              className="sm:w-48 lg:w-52"
              onChange={(next) =>
                patch({
                  productId: next,
                  variantId: '',
                  variantTypeId: '',
                  variantValueId: '',
                })
              }
            />

            {/* 5. Variant combinations — revealed for variant products */}
            <FilterSelect
              id="control-variant-filter"
              label="Variant Name"
              value={variantId}
              disabled={!variantComboEnabled}
              placeholder={variantPlaceholder}
              options={combinationOptions}
              className="sm:w-48 lg:w-52"
              onChange={(next) => patch({ variantId: next })}
            />

            {/* 6. Variant type — from selected product's combination axes */}
            <FilterSelect
              id="control-variant-type-filter"
              label="Variant type"
              value={variantTypeId}
              disabled={!variantTypeEnabled}
              placeholder={variantTypePlaceholder}
              options={typeAxisOptions}
              onChange={(next) =>
                patch({
                  variantTypeId: next,
                  variantValueId: '',
                })
              }
            />

            {/* 7. Variant value — values for the selected type */}
            <FilterSelect
              id="control-variant-value-filter"
              label="Variant value"
              value={variantValueId}
              disabled={!variantValueEnabled}
              placeholder={variantValuePlaceholder}
              options={valueAxisOptions}
              onChange={(next) => patch({ variantValueId: next })}
            />

            {/* 8. Date range */}
            <div className="w-full space-y-1.5 sm:w-36">
              <Label htmlFor="control-from-filter">From</Label>
              <Input
                id="control-from-filter"
                type="date"
                value={from}
                onChange={(event) => patch({ from: event.target.value })}
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <Label htmlFor="control-to-filter">To</Label>
              <Input
                id="control-to-filter"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => patch({ to: event.target.value })}
              />
            </div>

            {/* 9. Product type */}
            <FilterSelect
              id="control-type-filter"
              label="Type"
              value={type}
              placeholder="All Types"
              className="sm:w-36"
              options={[
                { id: PRODUCT_TYPES.SINGLE, label: 'Single Item' },
                { id: PRODUCT_TYPES.BUNDLE, label: 'Bundle' },
                { id: PRODUCT_TYPES.VARIANT, label: 'Variant' },
              ]}
              onChange={(next) => patch({ type: next })}
            />

            {/* 10. Reset — always visible; unclickable when nothing applied */}
            <div className="shrink-0 pb-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasActiveFilters}
                className="h-9 cursor-pointer px-3 text-xs text-slate-600 hover:text-slate-900 border-slate-200 disabled:cursor-not-allowed"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}

export default MovementFilters
