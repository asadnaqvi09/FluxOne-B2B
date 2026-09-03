import { useEffect, useState, useMemo } from 'react'
import { Search, Send } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, NativeSelect } from '@/components/ui/select'
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
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

const PAGE_SIZE = 8

export function BranchInventoryPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')

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
    setLoading(true)
    const params = { limit: 100 }
    if (searchQuery.trim()) params.q = searchQuery
    if (filterSubcategory) {
      params.categoryId = filterSubcategory
    } else if (filterCategory) {
      params.categoryId = filterCategory
    }

    const res = await apiClient.get('/inventory/products', params)
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
  }, [searchQuery, filterCategory, filterSubcategory])

  useEffect(() => {
    void fetchCategories()
  }, [])

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
          actions={
            <span className="text-xs font-medium text-slate-400">
              {products.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="text-slate-500 text-xs uppercase">
                  <TableHead>Image</TableHead>
                  <TableHead>ID / Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-400">Loading shelf stock...</TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-400">No stock products found</TableCell>
                  </TableRow>
                ) : (
                  products
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((prod) => {
                      const status = getStockStatus(prod.quantity, prod.reorderPoint)
                      const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                      const subcat = subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

                      return (
                        <TableRow key={prod.id}>
                          <TableCell>
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} className="size-10 rounded-lg object-cover border border-slate-100" />
                            ) : (
                              <div className="size-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">No Image</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900">{prod.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">SKU: {prod.itemCode}</div>
                          </TableCell>
                          <TableCell className="text-slate-600">{cat}</TableCell>
                          <TableCell className="text-slate-600">{subcat}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900 font-mono">
                            {parseFloat(prod.quantity || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{prod.scale || 'pcs'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant} className={status.className}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRequest(prod)}
                              className="text-xs h-8"
                            >
                              <Send className="size-3 mr-1.5" />
                              Stock Request
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={Math.max(1, Math.ceil(products.length / PAGE_SIZE))}
            totalItems={products.length}
            onPageChange={setPage}
          />

          <div className="mt-4 flex gap-4 text-xs text-slate-500 border-t border-border pt-3">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500" /> Empty: Out of stock (0 items)</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" /> Limited: Under reorder point threshold</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> In Stock: Adequate supplies</span>
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
