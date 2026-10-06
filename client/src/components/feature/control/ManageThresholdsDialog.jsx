import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, PencilIcon } from 'lucide-react'
import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { displayItemCode } from '@/lib/formatDisplayId'
import { fetchControlProductOptions } from '@/hooks/useInventoryControl'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

const STATUS_META = {
  in: { label: 'In stock', className: 'bg-emerald-50 text-emerald-700' },
  low: { label: 'Low stock', className: 'bg-amber-50 text-amber-700' },
  out: { label: 'Out of stock', className: 'bg-red-50 text-red-700' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.in
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        meta.className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {meta.label}
    </span>
  )
}

// Wider than Dialog defaults (md:max-w-xl) so Status / Actions stay visible.
const DIALOG_WIDTH =
  'max-w-[min(96vw,72rem)] sm:max-w-[min(96vw,72rem)] md:max-w-[min(96vw,72rem)]'

// Manage Thresholds — Figma Global-Manage-Threshold compact table
export function ManageThresholdsDialog({
  open,
  onOpenChange,
  catalog,
  onChanged,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [threshold, setThreshold] = useState('10')
  const [productId, setProductId] = useState('')
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)

  const parents = catalog?.parents || []

  async function loadList(search = q) {
    setLoading(true)
    const res = await apiClient.get(endpoints.control.thresholds, {
      q: search || undefined,
    })
    const list = res.success && Array.isArray(res.data?.items) ? res.data.items : []
    setItems(list)
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setQ('')
      await loadList('')
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open only
  }, [open])

  useEffect(() => {
    if (!addOpen) return undefined
    let cancelled = false
    void fetchControlProductOptions({ limit: 100 }).then((res) => {
      if (cancelled) return
      setProducts(res.success ? res.items : [])
    })
    return () => {
      cancelled = true
    }
  }, [addOpen])

  const countLabel = useMemo(() => {
    const n = items.length
    return `${n} product${n === 1 ? '' : 's'} & variants`
  }, [items.length])

  async function handleSaveThreshold({ id, value }) {
    setSaving(true)
    try {
      const res = await apiClient.post(endpoints.control.thresholds, {
        productId: id,
        reorderPoint: Number(value),
      })
      if (!res.success) {
        toastError(res.error || 'Save failed')
        return false
      }
      toastSuccess('Threshold saved')
      setAddOpen(false)
      setEditRow(null)
      setProductId('')
      setThreshold('10')
      await loadList()
      onChanged?.()
      return true
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(row) {
    setSaving(true)
    try {
      const res = await apiClient.delete(endpoints.control.threshold(row.id))
      if (!res.success) {
        toastError(res.error || 'Remove failed')
        return
      }
      toastSuccess('Threshold removed')
      await loadList()
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={DIALOG_WIDTH}>
          <DialogHeader>
            <DialogTitle>Manage Thresholds</DialogTitle>
            <DialogDescription>
              Set the right minimum for every item and variant.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar — count left, search + Add right (Figma) */}
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{countLabel}</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={q}
                  placeholder="Search item…"
                  className="h-9 pl-8"
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadList(q)
                  }}
                />
              </div>
              {/* <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => void loadList(q)}
              >
                Search
              </Button> */}
              <Button
                type="button"
                variant="brand"
                size="sm"
                className="h-9"
                style={{ background: BRAND.purple }}
                onClick={() => {
                  setProductId('')
                  setThreshold('10')
                  setAddOpen(true)
                }}
              >
                <Plus className="size-4" />
                Add threshold
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No products found.
            </p>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto overflow-x-hidden rounded-xl border border-border">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 z-[1] bg-slate-50 text-[11px] tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="w-[28%] px-3 py-2.5 font-semibold">Item / variant</th>
                    <th className="w-[18%] px-3 py-2.5 font-semibold">Category</th>
                    <th className="w-[12%] px-3 py-2.5 font-semibold">Current stock</th>
                    <th className="w-[10%] px-3 py-2.5 font-semibold">Threshold</th>
                    <th className="w-[14%] px-3 py-2.5 font-semibold">Status</th>
                    <th className="w-[18%] px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-t border-border bg-white">
                      <td className="px-3 py-3 align-middle">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <ProductImageCell src={row.imageUrl} name={row.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900" title={row.name}>
                              {row.name}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {[
                                row.variantLabel || row.scale,
                                displayItemCode({
                                  itemCode: row.itemCode,
                                  productId: row.id,
                                }),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <p className="truncate text-slate-800" title={row.categoryName || ''}>
                          {row.categoryName || '—'}
                        </p>
                        {row.subcategoryName ? (
                          <p className="truncate text-xs text-slate-400">{row.subcategoryName}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-middle font-semibold tabular-nums text-slate-900">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-3 align-middle tabular-nums text-slate-600">
                        {row.reorderPoint}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <StatusBadge status={row.stockStatus} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            style={{ color: BRAND.purple }}
                            onClick={() => {
                              setEditRow(row)
                              setThreshold(String(row.reorderPoint ?? 10))
                            }}
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Remove threshold"
                            disabled={saving}
                            onClick={() => void handleRemove(row)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md sm:max-w-md md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add threshold</DialogTitle>
            <DialogDescription>Choose a product and minimum stock quantity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <NativeSelect
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.itemCode ? ` (${p.itemCode})` : ''}
                  </option>
                ))}
              </NativeSelect>
              {parents.length === 0 ? null : (
                <p className="text-[11px] text-slate-400">
                  Showing active catalog products (including variants).
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Minimum threshold quantity</Label>
              <WholeNumberInput
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogCancelButton />
            <Button
              type="button"
              variant="brand"
              style={{ background: BRAND.purple }}
              disabled={saving || !productId}
              onClick={() =>
                void handleSaveThreshold({ id: productId, value: threshold })
              }
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editRow)}
        onOpenChange={(next) => {
          if (!next) setEditRow(null)
        }}
      >
        <DialogContent className="max-w-md sm:max-w-md md:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit threshold</DialogTitle>
            <DialogDescription>
              {editRow?.name || 'Product'}
              {editRow?.variantLabel ? ` · ${editRow.variantLabel}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Minimum threshold quantity</Label>
            <WholeNumberInput
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogCancelButton />
            <Button
              type="button"
              variant="brand"
              style={{ background: BRAND.purple }}
              disabled={saving || !editRow?.id}
              onClick={() =>
                void handleSaveThreshold({ id: editRow.id, value: threshold })
              }
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ManageThresholdsDialog
