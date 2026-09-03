import { useEffect, useState, useMemo } from 'react'
import { Plus, Tag, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
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
import { toastError, toastSuccess } from '@/lib/toast'

const PAGE_SIZE = 8

export function DiscountsPage() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [page, setPage] = useState(1)

  // Form states
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'edit'
  const [editing, setEditing] = useState(null)
  
  const [name, setName] = useState('')
  const [percent, setPercent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTargetDiscount, setDeleteTargetDiscount] = useState(null)

  const fetchDiscounts = async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.branch.discounts.list)
    setLoading(false)
    if (res.success && res.data) {
      setDiscounts(res.data || [])
    }
  }

  const fetchCategories = async () => {
    const res = await apiClient.get('/inventory/products/categories')
    if (res.success && res.data) {
      setCategories(res.data || [])
    }
  }

  useEffect(() => {
    void fetchDiscounts()
    void fetchCategories()
  }, [])

  const handleOpenCreate = () => {
    setMode('create')
    setEditing(null)
    setName('')
    setPercent('')
    setOpen(true)
  }

  const handleOpenEdit = (discount) => {
    setMode('edit')
    setEditing(discount)
    setName(discount.name)
    setPercent(String(discount.percent))
    setOpen(true)
  }

  const handleSaveDiscount = async (e) => {
    e.preventDefault()
    if (!name.trim() || !percent) {
      return toastError('Discount name and percentage are required')
    }

    const value = parseFloat(percent)
    if (isNaN(value) || value < 0 || value > 100) {
      return toastError('Discount percentage must be between 0 and 100')
    }

    setSaving(true)
    let res
    if (mode === 'create') {
      res = await apiClient.post(endpoints.branch.discounts.create, { name, percent: value })
    } else {
      res = await apiClient.put(endpoints.branch.discounts.update(editing.id), { name, percent: value })
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

  const filteredDiscounts = discounts.filter((d) => {
    return true
  })

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Promo Offers"
          title="Discount Management"
          description="Manage promotional campaigns, store-wide sales, and percentage offers."
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
          actions={
            <span className="text-xs font-medium text-slate-400">
              {filteredDiscounts.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-slate-500 text-xs uppercase">
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Campaign Name / Explanation</TableHead>
                  <TableHead className="text-center">Discount Percentage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400">Loading campaign offers...</TableCell>
                  </TableRow>
                ) : filteredDiscounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400">No campaigns found</TableCell>
                  </TableRow>
                ) : (
                  filteredDiscounts
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((disc) => (
                      <TableRow key={disc.id}>
                        <TableCell className="font-mono font-bold text-slate-900">{disc.id}</TableCell>
                        <TableCell className="text-slate-800 font-semibold">{disc.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success" className="inline-flex items-center gap-1 font-bold text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-none rounded px-2.5 py-1">
                            <Tag className="size-3" />
                            {parseFloat(disc.percent)}% OFF
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-3.5">
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-800 transition-colors inline-block align-middle"
                            onClick={() => handleOpenEdit(disc)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-slate-800 transition-colors inline-block align-middle"
                            onClick={() => handleDeleteDiscount(disc.id)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={Math.max(1, Math.ceil(filteredDiscounts.length / PAGE_SIZE))}
            totalItems={filteredDiscounts.length}
            onPageChange={setPage}
          />
        </SurfaceCard>
      </MotionReveal>

      {/* Add / Edit Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
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

      <ConfirmDialog
        open={Boolean(deleteTargetDiscount)}
        onOpenChange={(open) => { if (!open) setDeleteTargetDiscount(null) }}
        title="Delete discount campaign?"
        description={`Delete promotional offer "${deleteTargetDiscount?.name || ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteDiscount}
        loading={saving}
      />
    </div>
  )
}
export default DiscountsPage
