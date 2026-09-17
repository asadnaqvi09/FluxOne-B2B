import { useEffect, useRef, useState } from 'react'
import { Search, Send } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogCancelButton } from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useClientPagination } from '@/hooks/useClientPagination'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

export function BranchInventoryPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedProducts,
  } = useClientPagination(products)

  // Filters — input instant; list fetch after debounce
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery, 300)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const fetchSeq = useRef(0)

  // Derived: top-level categories (no parentId) and subcategories (has parentId)
  const topCategories = categories.filter((c) => !c.parentId)
  const subcategories = categories.filter((c) => !!c.parentId)
  const visibleSubcategories = filterCategory
    ? subcategories.filter((s) => s.parentId === filterCategory)
    : subcategories

  // Stock Request Dialog
  const [requestTarget, setRequestTarget] = useState(null)
  const [requestKind, setRequestKind] = useState('request') // 'alert' | 'request'
  const [remainingQty, setRemainingQty] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const fetchInventory = async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    const params = { limit: 100 }
    if (debouncedQ.trim()) params.q = debouncedQ.trim()
    if (filterSubcategory) {
      params.categoryId = filterSubcategory
    } else if (filterCategory) {
      params.categoryId = filterCategory
    }

    const res = await apiClient.get('/inventory/products', params)
    if (seq !== fetchSeq.current) return

    setLoading(false)
    if (res.success && res.data) {
      setProducts(res.data.items || res.data || [])
    }
  }

  const fetchCategories = async () => {
    const res = await apiClient.get('/inventory/products/categories')
    if (res.success && res.data) {
      setCategories(res.data || [])
    }
  }

  useEffect(() => {
    void fetchInventory()
  }, [debouncedQ, filterCategory, filterSubcategory])

  useEffect(() => {
    void fetchCategories()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, filterCategory, filterSubcategory])

  const handleOpenRequest = (prod) => {
    setRequestTarget(prod)
    setRequestKind('request')
    setRemainingQty(parseFloat(prod.quantity || 0))
  }

  const handleSendRequest = async (e) => {
    e.preventDefault()
    if (!requestTarget) return

    setSubmitting(true)
    const res = await apiClient.post('/branch/stock-requests', {
      productId: requestTarget.id,
      kind: requestKind,
      remainingQuantity: remainingQty,
    })
    setSubmitting(false)

    if (res.success) {
      toastSuccess('Stock request sent to Inventory Management successfully')
      setRequestTarget(null)
    } else {
      toastError(res.error || 'Failed to send stock request')
    }
  }

  // Stock Level Status Indicators mapped to Shadcn Badge variants
  const getStockStatus = (qty, reorderPoint) => {
    const num = parseFloat(qty || 0)
    const point = parseFloat(reorderPoint || 10)
    if (num === 0) {
      return {
        label: 'Empty',
        variant: 'destructive',
        className: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-none px-2.5 py-0.5',
      }
    }
    if (num <= point) {
      return {
        label: 'Limited',
        variant: 'warning',
        className: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-2.5 py-0.5',
      }
    }
    return {
      label: 'In Stock',
      variant: 'success',
      className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-0.5',
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Inventory"
          title="Inventory Monitoring"
          description="Monitor real-time shelf stock levels and send stock replenishment requests."
        />
      </MotionHeader>

      {/* Filters */}
      <MotionReveal delay={0.02}>
        <SurfaceCard padding="compact">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="stock-search">Search Item</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="stock-search"
                  value={searchQuery}
                  placeholder="Item name, SKU, or ID…"
                  className="pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Filter Category</Label>
              <NativeSelect
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value)
                  setFilterSubcategory('') // reset subcategory when category changes
                }}
              >
                <option value="">All Categories</option>
                {topCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label>Filter Subcategory</Label>
              <NativeSelect
                value={filterSubcategory}
                onChange={(e) => setFilterSubcategory(e.target.value)}
                disabled={visibleSubcategories.length === 0}
              >
                <option value="">All Subcategories</option>
                {visibleSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </SurfaceCard>
      </MotionReveal>

      {/* Grid List using Shadcn Table component */}
      <MotionReveal delay={0.04}>
        <SurfaceCard
          title="Shelf Stock Levels"
          className="min-h-[400px]"
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading shelf stock...</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No stock products found</p>
          ) : (
            <>
              {/* Mobile cards — table-fixed was crushing columns on narrow screens */}
              <div className="space-y-3 md:hidden">
                {pagedProducts.map((prod) => {
                  const status = getStockStatus(prod.quantity, prod.reorderPoint)
                  const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                  const subcat = subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

                  return (
                    <article
                      key={prod.id}
                      className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="size-12 shrink-0 rounded-lg border border-slate-100 object-cover"
                          />
                        ) : (
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                            N/A
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{prod.name}</p>
                              <p className="font-mono text-[11px] text-slate-400">SKU: {prod.itemCode}</p>
                            </div>
                            <Badge variant={status.variant} className={`shrink-0 ${status.className}`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="mt-1.5 truncate text-xs text-slate-500">
                            {cat}
                            {subcat !== '—' ? ` · ${subcat}` : ''}
                          </p>
                          <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                            {parseFloat(prod.quantity || 0).toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-400">
                              {prod.scale || 'pcs'}
                            </span>
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRequest(prod)}
                            className="mt-3 h-8 w-full text-xs sm:w-auto"
                          >
                            <Send className="mr-1.5 size-3" />
                            Stock Request
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[44rem] w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-2 py-3 whitespace-nowrap">Image</TableHead>
                      <TableHead className="px-2 py-3 whitespace-nowrap min-w-[10rem]">ID / Name</TableHead>
                      <TableHead className="px-2 py-3 whitespace-nowrap">Category</TableHead>
                      <TableHead className="hidden px-2 py-3 whitespace-nowrap lg:table-cell">
                        Subcategory
                      </TableHead>
                      <TableHead className="px-2 py-3 text-right whitespace-nowrap">In Stock</TableHead>
                      <TableHead className="px-2 py-3 text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="sticky right-0 z-[1] bg-slate-200/80 px-2 py-3 text-right whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedProducts.map((prod) => {
                      const status = getStockStatus(prod.quantity, prod.reorderPoint)
                      const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                      const subcat = subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

                      return (
                        <TableRow key={prod.id} className="group">
                          <TableCell className="px-2 py-3">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="size-10 rounded-lg border border-slate-100 object-cover"
                              />
                            ) : (
                              <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                N/A
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <div className="font-bold text-slate-900">{prod.name}</div>
                            <div className="font-mono text-[10px] text-slate-400">SKU: {prod.itemCode}</div>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-slate-600">{cat}</TableCell>
                          <TableCell className="hidden px-2 py-3 text-slate-600 lg:table-cell">
                            {subcat}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {parseFloat(prod.quantity || 0).toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-400">
                              {prod.scale || 'pcs'}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            <Badge variant={status.variant} className={status.className}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="sticky right-0 z-[1] bg-white px-2 py-3 text-right group-hover:bg-slate-50/80">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRequest(prod)}
                              className="h-8 text-xs"
                            >
                              <Send className="mr-1.5 size-3" />
                              Stock Request
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-rose-500" /> Empty: Out of stock (0 items)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-amber-500" /> Limited: Under reorder point threshold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-emerald-500" /> In Stock: Adequate supplies
            </span>
          </div>
        </SurfaceCard>
      </MotionReveal>

      {/* Stock Request Dialog */}
      <Dialog open={Boolean(requestTarget)} onOpenChange={(open) => { if (!open) setRequestTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Replenishment Request</DialogTitle>
            <DialogDescription>
              Submit a stock request to the central Inventory Manager for this branch product.
            </DialogDescription>
          </DialogHeader>

          {requestTarget && (
            <form className="space-y-4" onSubmit={handleSendRequest}>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                <div><strong>Product:</strong> {requestTarget.name}</div>
                <div><strong>Current Stock:</strong> {parseFloat(requestTarget.quantity || 0)} {requestTarget.scale}</div>
                <div><strong>Reorder point:</strong> {parseFloat(requestTarget.reorderPoint || 0)} {requestTarget.scale}</div>
              </div>

              <div className="space-y-1.5">
                <Label>Request Type</Label>
                <NativeSelect
                  value={requestKind}
                  onChange={(e) => setRequestKind(e.target.value)}
                >
                  <option value="request">Replenishment request (Demand supply)</option>
                  <option value="alert">Low stock alert notification</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="request-qty">Remaining Quantity</Label>
                <Input
                  id="request-qty"
                  type="number"
                  step="0.001"
                  value={remainingQty}
                  onChange={(e) => setRemainingQty(parseFloat(e.target.value))}
                  required
                />
              </div>

              <DialogFooter>
                <DialogCancelButton disabled={submitting} className="w-full sm:w-auto" />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-white w-full sm:w-auto"
                  style={{ backgroundColor: BRAND.purple }}
                >
                  {submitting ? 'Sending…' : 'Send Request'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BranchInventoryPage
