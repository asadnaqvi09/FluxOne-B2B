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
} from 'lucide-react'

const PAGE_SIZE = ADMIN_TAX_PROFIT_PAGE_SIZE

export function TaxProfitPage() {
  const [selectedIds, setSelectedIds] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('')
  const [selectedScale, setSelectedScale] = useState('')
  const [presetFilter, setPresetFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [profitDialogOpen, setProfitDialogOpen] = useState(false)
  const [taxDialogOpen, setTaxDialogOpen] = useState(false)
  const [bulkProfitValue, setBulkProfitValue] = useState('20')
  const [bulkTaxValue, setBulkTaxValue] = useState('5')

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
    bulkSetProfit,
    bulkSetTax,
  } = useAdminTaxProfit({
    q: debouncedQ,
    categoryId: selectedCategoryId,
    subcategoryId: selectedSubcategoryId,
    scale: selectedScale,
    sort: presetFilter,
    page,
    limit: PAGE_SIZE,
  })

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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={products.length === 0}
                className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer disabled:opacity-40"
              >
                {isAllSelected ? (
                  <CheckSquare className="size-4 text-purple-700" />
                ) : (
                  <Square className="size-4 text-slate-400" />
                )}
                <span>Select Page ({products.length})</span>
              </button>
              {selectedIds.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-purple-100/70 text-purple-900 border-purple-300 text-xs font-bold px-2.5 py-0.5"
                >
                  {selectedIds.length} Selected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={selectedIds.length === 0 || mutating}
                onClick={() => setProfitDialogOpen(true)}
                size="sm"
                className="h-9 px-4 text-xs font-bold cursor-pointer text-white disabled:opacity-40 rounded-xl shadow-xs"
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
                className="h-9 px-4 text-xs font-bold cursor-pointer text-white disabled:opacity-40 rounded-xl shadow-xs"
                style={{ background: BRAND.deep }}
              >
                <Calculator className="mr-1.5 size-3.5" />
                Set Tax %
              </Button>
            </div>
          </div>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.15}>
        <SurfaceCard
          title="Catalog Pricing & Profit Margins"
          description="Final retail price = base cost + profit % + tax % (on cost)"
          actions={
            <span className="text-xs font-medium text-slate-400">
              {totalCatalog} records · {PAGE_SIZE} / page
            </span>
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
              <div className="overflow-x-auto">
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
                        <TableHead className="px-3 py-3 font-medium">Barcode</TableHead>
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
                        <TableHead className="px-3 py-3 text-right font-bold text-slate-900">
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
                          className={`hover:bg-slate-50/70 transition-colors ${
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
                            <TableCell className="px-3 py-3 font-mono text-xs text-slate-500">
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
                              Rs. {Number(p.baseCost || 0).toLocaleString()}
                            </TableCell>
                          )}

                          {visibleColumns.profitPct && (
                            <TableCell className="px-3 py-3">
                              <span className="inline-flex items-center font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                +{p.profitPct}%
                              </span>
                            </TableCell>
                          )}

                          {visibleColumns.taxPct && (
                            <TableCell className="px-3 py-3">
                              <span className="inline-flex items-center font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {p.taxPct > 0 ? `${p.taxPct}%` : '0% (Exempt)'}
                              </span>
                            </TableCell>
                          )}

                          {visibleColumns.finalPrice && (
                            <TableCell className="px-3 py-3 text-right">
                              <span className="font-extrabold text-sm text-purple-950 block">
                                Rs. {Number(finalPrice).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Margin: Rs.{' '}
                                {(Number(finalPrice) - Number(p.baseCost || 0)).toLocaleString()}
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
                onPageChange={setPage}
              />
            </>
          )}
        </SurfaceCard>
      </MotionReveal>

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
              <Input
                id="profitInput"
                type="number"
                min="0"
                max="100"
                step="1"
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
              <Input
                id="taxInput"
                type="number"
                min="0"
                max="100"
                step="1"
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
