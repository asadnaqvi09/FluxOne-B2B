import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { EmptyState } from '@/components/shared/EmptyState'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ADMIN_TAX_PROFIT_PAGE_SIZE,
  useAdminTaxProfit,
} from '@/hooks/useAdminTaxProfit'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCurrency } from '@/hooks/useCurrency'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import { validatePercentage } from '@/lib/validation/formValidators'
import {
  Percent,
  Calculator,
  Search,
  CheckSquare,
  Square,
  TrendingUp,
  Award,
  ArrowDownWideNarrow,
  Columns,
  Loader2,
  PackageOpen,
  Settings,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ShieldAlert,
  Info,
} from 'lucide-react'

const PAGE_SIZE = ADMIN_TAX_PROFIT_PAGE_SIZE

export function TaxProfitPage() {
  const { format: money } = useCurrency()
  const [selectedIds, setSelectedIds] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('')
  const [selectedScale, setSelectedScale] = useState('')
  const [presetFilter, setPresetFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(ADMIN_TAX_PROFIT_PAGE_SIZE)

  const [profitDialogOpen, setProfitDialogOpen] = useState(false)
  const [taxDialogOpen, setTaxDialogOpen] = useState(false)
  const [bulkProfitValue, setBulkProfitValue] = useState('20')
  const [bulkTaxValue, setBulkTaxValue] = useState('5')

  // Default Tax & Profit configuration states
  const [defaultTaxProfitDialogOpen, setDefaultTaxProfitDialogOpen] = useState(false)
  const [defaultTaxValue, setDefaultTaxValue] = useState('0')
  const [defaultProfitValue, setDefaultProfitValue] = useState('0')

  // Individual product override dialog state
  const [singleItemModalOpen, setSingleItemModalOpen] = useState(false)
  const [singleItemTarget, setSingleItemTarget] = useState(null)
  const [singleProfitValue, setSingleProfitValue] = useState('0')
  const [singleTaxValue, setSingleTaxValue] = useState('0')

  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    image: true,
    barcode: true,
    category: true,
    baseCost: true,
    profitPct: true,
    taxPct: true,
    finalPrice: true,
  })
  const [colMenuOpen, setColMenuOpen] = useState(false)

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [debouncedQ, selectedCategoryId, selectedSubcategoryId, selectedScale, presetFilter])

  const {
    items: products,
    meta,
    pagination,
    loading,
    mutating,
    error,
    updateDefaults,
    bulkSetProfit,
    bulkSetTax,
  } = useAdminTaxProfit({
    q: debouncedQ,
    categoryId: selectedCategoryId,
    subcategoryId: selectedSubcategoryId,
    scale: selectedScale,
    sort: presetFilter,
    page,
    limit,
  })

  // Sync current defaults from meta
  useEffect(() => {
    if (meta?.defaults) {
      setDefaultProfitValue(String(meta.defaults.defaultProfitPercent ?? 0))
      setDefaultTaxValue(String(meta.defaults.defaultTaxPercent ?? 0))
    }
  }, [meta?.defaults])

  const slowHint = useSlowLoadingHint(loading)
  const totalCatalog = pagination.total || 0
  const hasFilters =
    Boolean(debouncedQ) ||
    Boolean(selectedCategoryId) ||
    Boolean(selectedSubcategoryId) ||
    Boolean(selectedScale) ||
    presetFilter !== 'all'

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategoryId) return []
    const parent = meta.categories.find((c) => c.id === selectedCategoryId)
    return parent?.children || []
  }, [meta.categories, selectedCategoryId])

  const pageIds = products.map((p) => p.id)
  const isAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

  function handleToggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
      return
    }
    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])])
  }

  function handleToggleRow(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function handleOpenSingleItemEdit(product) {
    setSingleItemTarget(product)
    setSingleProfitValue(String(product.profitPct ?? 0))
    setSingleTaxValue(String(product.taxPct ?? 0))
    setSingleItemModalOpen(true)
  }

  async function handleSaveSingleItemOverrides(e) {
    e.preventDefault()
    if (!singleItemTarget) return

    const profitErr = validatePercentage(singleProfitValue, {
      min: 0,
      max: 100,
      fieldName: 'Profit percentage',
    })
    if (profitErr) {
      toastError(profitErr)
      return
    }

    const taxErr = validatePercentage(singleTaxValue, {
      min: 0,
      max: 100,
      fieldName: 'Tax percentage',
    })
    if (taxErr) {
      toastError(taxErr)
      return
    }

    const profitNum = Number(singleProfitValue)
    const taxNum = Number(singleTaxValue)

    const profitRes = await bulkSetProfit([singleItemTarget.id], profitNum)
    if (!profitRes.success) {
      toastError(profitRes.error || 'Failed to update profit %')
      return
    }

    const taxRes = await bulkSetTax([singleItemTarget.id], taxNum)
    if (!taxRes.success) {
      toastError(taxRes.error || 'Failed to update tax %')
      return
    }

    toastSuccess(`Updated "${singleItemTarget.name}" margin & tax settings`)
    setSingleItemModalOpen(false)
    setSingleItemTarget(null)
  }

  // --- Default Profit & Tax Handlers ---
  function handleOpenDefaultTaxProfit() {
    setDefaultTaxValue(String(meta?.defaults?.defaultTaxPercent ?? 0))
    setDefaultProfitValue(String(meta?.defaults?.defaultProfitPercent ?? 0))
    setDefaultTaxProfitDialogOpen(true)
  }

  async function handleSaveDefaults(e) {
    e?.preventDefault()

    const taxErr = validatePercentage(defaultTaxValue, {
      min: 0,
      max: 100,
      fieldName: 'Default tax percentage',
    })
    if (taxErr) {
      toastError(taxErr)
      return
    }

    const profitErr = validatePercentage(defaultProfitValue, {
      min: 0,
      max: 100,
      fieldName: 'Default profit percentage',
    })
    if (profitErr) {
      toastError(profitErr)
      return
    }

    const taxNum = Number(defaultTaxValue)
    const profitNum = Number(defaultProfitValue)

    const result = await updateDefaults({
      defaultTaxPercent: taxNum,
      defaultProfitPercent: profitNum,
      applyToAllProducts: false,
    })

    if (!result.success) {
      toastError(result.error || 'Failed to update default setting')
      return
    }

    toastSuccess(
      `Default Tax (${taxNum}%) and Profit (${profitNum}%) saved. This will automatically apply to newly created products.`,
    )
    setDefaultTaxProfitDialogOpen(false)
  }

  async function handleApplyBulkProfit(e) {
    e.preventDefault()
    const err = validatePercentage(bulkProfitValue, {
      min: 0,
      max: 100,
      fieldName: 'Profit percentage',
    })
    if (err) {
      toastError(err)
      return
    }
    if (selectedIds.length === 0) {
      toastError('Select at least one product')
      return
    }

    const profitNum = Number(bulkProfitValue)
    const result = await bulkSetProfit(selectedIds, profitNum)
    if (!result.success) {
      toastError(result.error || 'Failed to update profit %')
      return
    }

    toastSuccess(
      `Updated Profit to ${profitNum}% across ${result.data?.updated ?? selectedIds.length} selected items`,
    )
    setSelectedIds([])
    setProfitDialogOpen(false)
  }

  async function handleApplyBulkTax(e) {
    e.preventDefault()
    const err = validatePercentage(bulkTaxValue, {
      min: 0,
      max: 100,
      fieldName: 'Tax percentage',
    })
    if (err) {
      toastError(err)
      return
    }
    if (selectedIds.length === 0) {
      toastError('Select at least one product')
      return
    }

    const taxNum = Number(bulkTaxValue)
    const result = await bulkSetTax(selectedIds, taxNum)
    if (!result.success) {
      toastError(result.error || 'Failed to update tax %')
      return
    }

    toastSuccess(
      `Updated Tax to ${taxNum}% across ${result.data?.updated ?? selectedIds.length} selected items`,
    )
    setSelectedIds([])
    setTaxDialogOpen(false)
  }

  function calculateFinalPrice(baseCost, profitPct, taxPct) {
    const profitAmount = (baseCost * (profitPct || 0)) / 100
    const taxAmount = (baseCost * (taxPct || 0)) / 100
    return Math.round(baseCost + profitAmount + taxAmount)
  }

  const presetClass = (active) =>
    `rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
      active
        ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
        : 'bg-white text-slate-700 border-slate-200 hover:border-purple-200'
    }`

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Pricing & Margin Control"
          title="Tax & Profit Management"
          description="Global wholesale margin rules, sales tax compliance, and automated multi-branch price calculations"
          className="sm:items-center"
          actions={
            <Button
              type="button"
              onClick={handleOpenDefaultTaxProfit}
              className="h-9 px-3.5 text-xs font-bold cursor-pointer text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 flex items-center gap-1.5"
              style={{ background: BRAND.purple }}
            >
              <Settings className="size-3.5" />
              Set Default Tax & Profit
            </Button>
          }
        />
      </MotionHeader>

      <SlowLoadingBanner show={slowHint} />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <MotionReveal delay={0.05}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPresetFilter('all')}
            className={presetClass(presetFilter === 'all')}
          >
            All Products ({totalCatalog})
          </button>
          <button
            type="button"
            onClick={() => setPresetFilter('top_sales')}
            className={presetClass(presetFilter === 'top_sales')}
          >
            <TrendingUp className="size-3.5 text-emerald-500" />
            Most Selling (30d)
          </button>
          <button
            type="button"
            onClick={() => setPresetFilter('top_profit')}
            className={presetClass(presetFilter === 'top_profit')}
          >
            <Award className="size-3.5 text-amber-500" />
            Highest Profit Margin
          </button>
          <button
            type="button"
            onClick={() => setPresetFilter('slow_moving')}
            className={presetClass(presetFilter === 'slow_moving')}
          >
            <ArrowDownWideNarrow className="size-3.5 text-slate-500" />
            Slow Moving
          </button>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.1}>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-2xs">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            <div className="relative sm:col-span-6 lg:col-span-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by SKU, name, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
              />
            </div>

            <div className="sm:col-span-3 lg:col-span-2">
              <NativeSelect
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value)
                  setSelectedSubcategoryId('')
                }}
                className="h-10 w-full rounded-xl border-border bg-slate-50 text-xs font-medium"
              >
                <option value="">All Categories</option>
                {meta.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="sm:col-span-3 lg:col-span-2">
              <NativeSelect
                value={selectedSubcategoryId}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                disabled={!selectedCategoryId || subcategoryOptions.length === 0}
                className="h-10 w-full rounded-xl border-border bg-slate-50 text-xs font-medium"
              >
                <option value="">All Subcategories</option>
                {subcategoryOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="sm:col-span-3 lg:col-span-2">
              <NativeSelect
                value={selectedScale}
                onChange={(e) => setSelectedScale(e.target.value)}
                className="h-10 w-full rounded-xl border-border bg-slate-50 text-xs font-medium"
              >
                <option value="">All Scales</option>
                {meta.scales.map((s) => (
                  <option key={s} value={s}>
                    Scale: {s}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="relative sm:col-span-12 lg:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setColMenuOpen(!colMenuOpen)}
                className="h-10 w-full rounded-xl border-border text-xs cursor-pointer gap-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Columns className="size-3.5 text-slate-500" />
                <span>Columns</span>
              </Button>

              {colMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-white p-3 shadow-xl space-y-1.5 text-xs">
                  <span className="font-bold text-slate-700 block pb-1 border-b border-slate-100 text-[11px] uppercase tracking-wider">
                    Toggle Table Columns
                  </span>
                  {Object.keys(visibleColumns).map((colKey) => (
                    <label
                      key={colKey}
                      className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded-lg cursor-pointer capitalize font-medium text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[colKey]}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            [colKey]: e.target.checked,
                          })
                        }
                        className="rounded text-purple-600 focus:ring-0"
                      />
                      {colKey
                        .replace('Pct', ' %')
                        .replace('baseCost', 'Base Cost')
                        .replace('finalPrice', 'Final Price')}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.15}>
        <SurfaceCard
          title="Catalog Pricing & Profit Margins"
          description="Final retail price = base cost + profit % + tax % (on cost)"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-900 border-purple-200 text-xs font-bold px-2.5 py-1"
                >
                  {selectedIds.length} Selected
                </Badge>
              )}
              <Button
                type="button"
                disabled={selectedIds.length === 0 || mutating}
                onClick={() => setProfitDialogOpen(true)}
                size="sm"
                className="h-9 px-3.5 text-xs font-bold cursor-pointer text-white disabled:opacity-40 rounded-xl shadow-xs"
                style={{ background: BRAND.purple }}
              >
                <Percent className="mr-1.5 size-3.5" />
                Set Profit %
              </Button>
              <Button
                type="button"
                disabled={selectedIds.length === 0 || mutating}
                onClick={() => setTaxDialogOpen(true)}
                size="sm"
                className="h-9 px-3.5 text-xs font-bold cursor-pointer text-white disabled:opacity-40 rounded-xl shadow-xs"
                style={{ background: BRAND.deep }}
              >
                <Calculator className="mr-1.5 size-3.5" />
                Set Tax %
              </Button>
            </div>
          }
        >
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading catalog…
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title={
                hasFilters
                  ? 'No products match these filters'
                  : 'No products in this company yet'
              }
              description={
                hasFilters
                  ? 'Clear search or filters to see more of the catalog.'
                  : 'Create products from a branch Inventory Manager catalog first. Tax & Profit will list them here for bulk margin and tax updates.'
              }
              compact
            />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {products.map((p) => {
                  const isChecked = selectedIds.includes(p.id)
                  const finalPrice =
                    p.finalPrice ?? calculateFinalPrice(p.baseCost, p.profitPct, p.taxPct)

                  return (
                    <article
                      key={p.id}
                      className={`rounded-xl border px-3 py-3 ${
                        isChecked
                          ? 'border-purple-200 bg-purple-50/40'
                          : 'border-border bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(p.id)}
                          className="mt-1 rounded text-purple-600 focus:ring-0"
                          aria-label={`Select ${p.name}`}
                        />
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="size-10 shrink-0 rounded-lg border border-slate-200 object-cover shadow-2xs"
                          />
                        ) : (
                          <div className="size-10 shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{p.name}</p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {p.itemCode || p.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {p.category || 'Uncategorized'}
                            {p.subcategory ? ` / ${p.subcategory}` : ''}
                            {' · '}
                            {p.scaleLabel || p.scale || '—'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenSingleItemEdit(p)}
                              className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                            >
                              +{p.profitPct}%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenSingleItemEdit(p)}
                              className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                            >
                              {p.taxPct > 0 ? `${p.taxPct}%` : '0% (Exempt)'}
                            </button>
                          </div>
                          <div className="mt-2 flex items-end justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-slate-400">Base {money(p.baseCost)}</p>
                              <p className="text-sm font-extrabold text-purple-950">
                                {money(finalPrice)}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Margin {money(Number(finalPrice) - Number(p.baseCost || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[50rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded text-purple-600 focus:ring-0"
                        />
                      </TableHead>
                      {visibleColumns.id && (
                        <TableHead className="px-3 py-3 font-medium">SKU ID</TableHead>
                      )}
                      {visibleColumns.image && (
                        <TableHead className="px-3 py-3 font-medium">Image</TableHead>
                      )}
                      {visibleColumns.name && (
                        <TableHead className="px-3 py-3 font-medium">Product Name</TableHead>
                      )}
                      {visibleColumns.barcode && (
                        <TableHead className="hidden px-3 py-3 font-medium lg:table-cell">
                          Barcode
                        </TableHead>
                      )}
                      {visibleColumns.category && (
                        <TableHead className="px-3 py-3 font-medium">Category / Scale</TableHead>
                      )}
                      {visibleColumns.baseCost && (
                        <TableHead className="px-3 py-3 font-medium">Base Cost</TableHead>
                      )}
                      {visibleColumns.profitPct && (
                        <TableHead className="px-3 py-3 font-medium">Profit %</TableHead>
                      )}
                      {visibleColumns.taxPct && (
                        <TableHead className="px-3 py-3 font-medium">Tax %</TableHead>
                      )}
                      {visibleColumns.finalPrice && (
                        <TableHead className="sticky right-0 z-[1] bg-white px-3 py-3 text-right font-bold text-slate-900">
                          Final Price
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const isChecked = selectedIds.includes(p.id)
                      const finalPrice =
                        p.finalPrice ??
                        calculateFinalPrice(p.baseCost, p.profitPct, p.taxPct)

                      return (
                        <TableRow
                          key={p.id}
                          className={`group hover:bg-slate-50/70 transition-colors ${
                            isChecked ? 'bg-purple-50/40' : ''
                          }`}
                        >
                          <TableCell className="w-10 px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRow(p.id)}
                              className="rounded text-purple-600 focus:ring-0"
                            />
                          </TableCell>

                          {visibleColumns.id && (
                            <TableCell className="px-3 py-3 font-mono text-xs font-bold text-slate-700">
                              {p.itemCode || p.id}
                            </TableCell>
                          )}

                          {visibleColumns.image && (
                            <TableCell className="px-3 py-3">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="size-10 rounded-lg object-cover border border-slate-200 shadow-2xs"
                                />
                              ) : (
                                <div className="size-10 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                              )}
                            </TableCell>
                          )}

                          {visibleColumns.name && (
                            <TableCell className="px-3 py-3 font-bold text-slate-900 text-xs">
                              {p.name}
                            </TableCell>
                          )}

                          {visibleColumns.barcode && (
                            <TableCell className="hidden px-3 py-3 font-mono text-xs text-slate-500 lg:table-cell">
                              {p.barcode || '—'}
                            </TableCell>
                          )}

                          {visibleColumns.category && (
                            <TableCell className="px-3 py-3 text-xs text-slate-600">
                              <span className="block font-medium">
                                {p.category || 'Uncategorized'}
                                {p.subcategory ? ` / ${p.subcategory}` : ''}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {p.scaleLabel || p.scale || '—'}
                              </span>
                            </TableCell>
                          )}

                          {visibleColumns.baseCost && (
                            <TableCell className="px-3 py-3 font-semibold text-slate-800 text-xs">
                              {money(p.baseCost)}
                            </TableCell>
                          )}

                          {visibleColumns.profitPct && (
                            <TableCell className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleItemEdit(p)}
                                title="Click to override Profit % for this product"
                                className="inline-flex items-center font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer"
                              >
                                +{p.profitPct}%
                              </button>
                            </TableCell>
                          )}

                          {visibleColumns.taxPct && (
                            <TableCell className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleItemEdit(p)}
                                title="Click to override Tax % for this product"
                                className="inline-flex items-center font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                              >
                                {p.taxPct > 0 ? `${p.taxPct}%` : '0% (Exempt)'}
                              </button>
                            </TableCell>
                          )}

                          {visibleColumns.finalPrice && (
                            <TableCell className="sticky right-0 z-[1] bg-white px-3 py-3 text-right group-hover:bg-slate-50/70">
                              <span className="font-extrabold text-sm text-purple-950 block">
                                {money(finalPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Margin: {money(Number(finalPrice) - Number(p.baseCost || 0))}
                              </span>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

          <TablePagination
            page={pagination.page || page}
            pageCount={pagination.pageCount || 1}
            totalItems={pagination.total || 0}
            pageSize={limit}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setLimit(next)
              setPage(1)
            }}
          />
            </>
          )}
        </SurfaceCard>
      </MotionReveal>

      {/* Set Default Tax % Dialog */}
      {/* Set Default Tax & Profit Dialog */}
      <Dialog open={defaultTaxProfitDialogOpen} onOpenChange={setDefaultTaxProfitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-4 text-purple-600" />
              Set Default Tax & Profit
            </DialogTitle>
            <DialogDescription>
              Configure default Tax % and Profit % that automatically apply to newly created products.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDefaults} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="defaultTaxInput" className="text-xs font-semibold">
                Default Tax %
              </Label>
              <WholeNumberInput
                id="defaultTaxInput"
<<<<<<< HEAD
                min={0}
                max={100}
=======
                type="number"
                min="0"
                max="100"
                step="0.01"
>>>>>>> 1f0570efb3bcad612e68ad31f5e65837d72f876f
                value={defaultTaxValue}
                onChange={(e) => setDefaultTaxValue(e.target.value)}
                placeholder="Enter tax percentage"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="defaultProfitInput" className="text-xs font-semibold">
                Default Profit %
              </Label>
              <WholeNumberInput
                id="defaultProfitInput"
<<<<<<< HEAD
                min={0}
                max={100}
=======
                type="number"
                min="0"
                max="100"
                step="0.01"
>>>>>>> 1f0570efb3bcad612e68ad31f5e65837d72f876f
                value={defaultProfitValue}
                onChange={(e) => setDefaultProfitValue(e.target.value)}
                placeholder="Enter profit percentage"
                required
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDefaultTaxProfitDialogOpen(false)}
                disabled={mutating}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold text-xs cursor-pointer shadow-xs"
                style={{ background: BRAND.purple }}
              >
                {mutating ? 'Saving…' : 'Set Default'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Individual Product Override Dialog */}
      <Dialog open={singleItemModalOpen} onOpenChange={setSingleItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-purple-600" />
              Edit Product Margin & Tax
            </DialogTitle>
            <DialogDescription>
              Override profit % and tax % for &quot;{singleItemTarget?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSingleItemOverrides} className="space-y-4 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Product SKU:</span>
                <span className="font-mono font-bold text-slate-800">{singleItemTarget?.itemCode || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Base Cost:</span>
                <span className="font-bold text-slate-800">{money(singleItemTarget?.baseCost)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="singleProfitInput" className="text-xs font-semibold">
                  Profit Margin (%)
                </Label>
                <WholeNumberInput
                id="singleProfitInput"
                min={0}
                max={100}
                value={singleProfitValue}
                onChange={(e) => setSingleProfitValue(e.target.value)}
                placeholder="e.g. 20"
                required
              />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="singleTaxInput" className="text-xs font-semibold">
                  Sales Tax (%)
                </Label>
                <WholeNumberInput
                id="singleTaxInput"
                min={0}
                max={100}
                value={singleTaxValue}
                onChange={(e) => setSingleTaxValue(e.target.value)}
                placeholder="e.g. 5"
                required
              />
              </div>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-xs text-purple-950 flex items-center justify-between">
              <span>Calculated Final Price:</span>
              <span className="font-extrabold text-sm text-purple-950">
                {money(
                  calculateFinalPrice(
                    singleItemTarget?.baseCost || 0,
                    Number(singleProfitValue) || 0,
                    Number(singleTaxValue) || 0,
                  ),
                )}
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSingleItemModalOpen(false)
                  setSingleItemTarget(null)
                }}
                disabled={mutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold"
                style={{ background: BRAND.purple }}
              >
                {mutating ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Profit Dialog */}
      <Dialog open={profitDialogOpen} onOpenChange={setProfitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Profit Margin Percentage</DialogTitle>
            <DialogDescription>
              Apply a standardized profit percentage to {selectedIds.length} selected items
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyBulkProfit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="profitInput" className="text-xs font-semibold">
                Profit Margin (%)
              </Label>
              <WholeNumberInput
                id="profitInput"
                min={0}
                max={100}
                value={bulkProfitValue}
                onChange={(e) => setBulkProfitValue(e.target.value)}
                placeholder="e.g. 25"
                required
              />
              <p className="text-[11px] text-slate-500">
                Selling price is recalculated from base cost × (1 + profit %). Tax is applied on cost in this view.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfitDialogOpen(false)}
                disabled={mutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold"
                style={{ background: BRAND.purple }}
              >
                {mutating ? 'Applying…' : 'Apply Profit %'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Tax Dialog */}
      <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Sales Tax Percentage</DialogTitle>
            <DialogDescription>
              Apply tax rate or exemption to {selectedIds.length} selected items
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyBulkTax} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="taxInput" className="text-xs font-semibold">
                Tax Percentage (%)
              </Label>
              <WholeNumberInput
                id="taxInput"
                min={0}
                max={100}
                value={bulkTaxValue}
                onChange={(e) => setBulkTaxValue(e.target.value)}
                placeholder="e.g. 5"
                required
              />
              <p className="text-[11px] text-slate-500">
                Enter 0 for tax-exempt essentials. Non-zero rates find or create a matching company tax.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaxDialogOpen(false)}
                disabled={mutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold"
                style={{ background: BRAND.deep }}
              >
                {mutating ? 'Applying…' : 'Apply Tax %'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TaxProfitPage

