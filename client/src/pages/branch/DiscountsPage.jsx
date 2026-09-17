import { useEffect, useState } from 'react'
import { Plus, Tag, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
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
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { displayDiscountRef } from '@/lib/formatDisplayId'
import { toastError, toastSuccess } from '@/lib/toast'
import { validateDiscountForm } from '@/lib/validation/branchForms'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { useClientPagination } from '@/hooks/useClientPagination'

export function DiscountsPage() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const filteredDiscounts = discounts
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedDiscounts,
  } = useClientPagination(filteredDiscounts)

  // Form states
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'edit'
  const [editing, setEditing] = useState(null)
  
  const [name, setName] = useState('')
  const [percent, setPercent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTargetDiscount, setDeleteTargetDiscount] = useState(null)

  const discountSnapshot = { name, percent, categoryId }
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    captureBaseline(discountSnapshot)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per open
  }, [open, captureBaseline])

  const fetchDiscounts = async () => {
    setLoading(true)
    const params = {}
    if (filterCategory) params.categoryId = filterCategory
    const res = await apiClient.get(endpoints.branch.discounts.list, params)
    setLoading(false)
    if (res.success && res.data) {
      setDiscounts(res.data || [])
    } else if (!res.success) {
      toastError(res.error || 'Failed to load discounts')
    }
  }

  const fetchCategories = async () => {
    const res = await apiClient.get('/inventory/products/categories')
    if (res.success && res.data) {
      const all = Array.isArray(res.data) ? res.data : res.data.items || []
      setCategories(all.filter((c) => !c.parentId))
    }
  }

  useEffect(() => {
    void fetchCategories()
  }, [])

  useEffect(() => {
    setPage(1)
    void fetchDiscounts()
  }, [filterCategory])

  const handleOpenCreate = () => {
    setMode('create')
    setEditing(null)
    setName('')
    setPercent('')
    setCategoryId('')
    setOpen(true)
  }

  const handleOpenEdit = (discount) => {
    setMode('edit')
    setEditing(discount)
    setName(discount.name)
    setPercent(String(discount.percent))
    setCategoryId(discount.categoryId || '')
    setOpen(true)
  }

  const handleSaveDiscount = async (e) => {
    e.preventDefault()
    const validationError = validateDiscountForm({ name, percent })
    if (validationError) {
      return toastError(validationError)
    }

    const value = parseFloat(percent)
    const payload = {
      name: name.trim(),
      percent: value,
      categoryId: categoryId || null,
    }

    setSaving(true)
    let res
    if (mode === 'create') {
      res = await apiClient.post(endpoints.branch.discounts.create, payload)
    } else {
      res = await apiClient.put(endpoints.branch.discounts.update(editing.id), payload)
    }
    setSaving(false)

    if (res.success) {
      toastSuccess(mode === 'create' ? 'Discount offer created' : 'Discount offer updated')
      setOpen(false)
      void fetchDiscounts()
    } else {
      toastError(res.error || 'Failed to save discount')
    }
  }

  const handleDeleteDiscount = (id) => {
    const disc = discounts.find((d) => d.id === id)
    setDeleteTargetDiscount(disc)
  }

  const confirmDeleteDiscount = async () => {
    if (!deleteTargetDiscount) return
    setSaving(true)
    const res = await apiClient.delete(endpoints.branch.discounts.delete(deleteTargetDiscount.id))
    setSaving(false)
    if (res.success) {
      toastSuccess('Discount deleted successfully')
      setDeleteTargetDiscount(null)
      void fetchDiscounts()
    } else {
      toastError(res.error || 'Failed to delete discount')
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Promo Offers"
          title="Discount Management"
          description="Manage promotional campaigns, store-wide sales, and percentage offers. Staff scoring scales live under Staff → Performance."
          actions={
            <Button
              style={{ backgroundColor: BRAND.purple }}
              className="text-white"
              onClick={handleOpenCreate}
            >
              <Plus className="size-4 mr-1.5" /> Add Discount
            </Button>
          }
        />
      </MotionHeader>

      {/* Filters */}
      <MotionReveal delay={0.02}>
        <SurfaceCard padding="compact">
          <div className="w-full space-y-1.5 sm:w-60">
            <Label htmlFor="disc-category">Filter Category</Label>
            <NativeSelect
              id="disc-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </NativeSelect>
          </div>
        </SurfaceCard>
      </MotionReveal>

      {/* Listing Grid using Shadcn Table component */}
      <MotionReveal delay={0.04}>
        <SurfaceCard
          title="Active Discount Campaigns"
          description="Standard discount templates that can be applied to products."
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading campaign offers...</p>
          ) : filteredDiscounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No campaigns found</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {pagedDiscounts.map((disc) => (
                    <article
                      key={disc.id}
                      className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{disc.name}</p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                            {displayDiscountRef(disc)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {disc.categoryName || 'All categories'}
                          </p>
                        </div>
                        <Badge
                          variant="success"
                          className="inline-flex shrink-0 items-center gap-1 rounded border-none bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          <Tag className="size-3" />
                          {parseFloat(disc.percent)}% OFF
                        </Badge>
                      </div>
                      <div className="mt-3 flex justify-end gap-3">
                        <button
                          type="button"
                          className="text-slate-500 transition-colors hover:text-slate-800"
                          onClick={() => handleOpenEdit(disc)}
                          aria-label="Edit discount"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="text-slate-500 transition-colors hover:text-slate-800"
                          onClick={() => handleDeleteDiscount(disc.id)}
                          aria-label="Delete discount"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[32rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-2 py-3">Campaign Code</TableHead>
                      <TableHead className="px-2 py-3">Campaign Name / Explanation</TableHead>
                      <TableHead className="px-2 py-3">Category</TableHead>
                      <TableHead className="px-2 py-3 text-center">Discount Percentage</TableHead>
                      <TableHead className="sticky right-0 z-[1] bg-white px-2 py-3 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedDiscounts.map((disc) => (
                        <TableRow key={disc.id} className="group">
                          <TableCell className="px-2 py-3 font-mono font-bold text-slate-900">
                            {displayDiscountRef(disc)}
                          </TableCell>
                          <TableCell className="px-2 py-3 font-semibold text-slate-800">
                            {disc.name}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-slate-600">
                            {disc.categoryName || 'All categories'}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center">
                            <Badge
                              variant="success"
                              className="inline-flex items-center gap-1 rounded border-none bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                            >
                              <Tag className="size-3" />
                              {parseFloat(disc.percent)}% OFF
                            </Badge>
                          </TableCell>
                          <TableCell className="sticky right-0 z-[1] space-x-3.5 bg-white px-2 py-3 text-right group-hover:bg-slate-50/80">
                            <button
                              type="button"
                              className="inline-block align-middle text-slate-500 transition-colors hover:text-slate-800"
                              onClick={() => handleOpenEdit(disc)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-block align-middle text-slate-500 transition-colors hover:text-slate-800"
                              onClick={() => handleDeleteDiscount(disc.id)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
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
        </SurfaceCard>
      </MotionReveal>

      {/* Add / Edit Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen} dirty={isDirty(discountSnapshot)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add New Discount' : 'Edit Discount'}</DialogTitle>
            <DialogDescription>
              Create a promotional campaign name and configure the discount percentage rate.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveDiscount}>
            <div className="space-y-1.5">
              <Label htmlFor="disc-form-name">Campaign Name / Explanation</Label>
              <Input
                id="disc-form-name"
                placeholder="e.g. Winter Sale, Cashier Promo 10%"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="disc-form-category">Category (optional)</Label>
              <NativeSelect
                id="disc-form-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="disc-form-pct">Discount Percentage (%)</Label>
              <Input
                id="disc-form-pct"
                type="number"
                step="0.01"
                placeholder="e.g. 15"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <DialogCancelButton disabled={saving} className="w-full sm:w-auto" />
              <Button
                type="submit"
                disabled={saving}
                className="text-white w-full sm:w-auto"
                style={{ backgroundColor: BRAND.purple }}
              >
                {saving ? 'Saving…' : 'Save Discount'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteEntityDialog
        open={Boolean(deleteTargetDiscount)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetDiscount(null)
        }}
        entityName={deleteTargetDiscount?.name}
        description={
          deleteTargetDiscount
            ? `Remove promotional offer “${deleteTargetDiscount.name}”? Discount campaigns have no Inactive state — this permanently deletes the offer.`
            : null
        }
        showSoftAction={false}
        canHardDelete
        hardLabel="Permanently delete"
        hardHint="This cannot be undone."
        loading={saving}
        onHardDelete={confirmDeleteDiscount}
      />
    </div>
  )
}
export default DiscountsPage
