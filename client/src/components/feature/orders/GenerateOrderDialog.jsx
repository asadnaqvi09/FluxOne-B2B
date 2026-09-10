import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/select'
import { BRAND } from '@/lib/constants'
import { money } from '@/lib/mapProduct'
import { useFormBaseline } from '@/hooks/useFormBaseline'

// Generate PO: pick supplier, multi products with qty + unit cost (shows last purchase).
export function GenerateOrderDialog({
  open,
  onOpenChange,
  suppliers = [],
  products = [],
  loading = false,
  onSubmit,
}) {
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState([])
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState(null)
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId) || null,
    [suppliers, supplierId],
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    setExplanation('')
    const snapshot = {
      supplierId: suppliers[0]?.id || '',
      lines: [],
      explanation: '',
    }
    setSupplierId(snapshot.supplierId)
    setLines(snapshot.lines)
    captureBaseline(snapshot)
  }, [open, suppliers])

  function addLine() {
    const first = products[0]
    if (!first) return
    setLines((prev) => [
      ...prev,
      {
        productId: first.id,
        quantity: 1,
        unitCost: Number(first.purchasePrice || 0),
        scale: first.scale || 'unit',
      },
    ])
  }

  function patchLine(index, field, value) {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const next = { ...row, [field]: value }
        if (field === 'productId') {
          const product = products.find((p) => p.id === value)
          if (product) {
            next.scale = product.scale || 'unit'
            next.unitCost = Number(product.purchasePrice || 0)
          }
        }
        return next
      }),
    )
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave(andPrint) {
    setError(null)
    if (!supplierId) {
      setError('Select a company / supplier')
      return
    }
    if (!lines.length) {
      setError('Add at least one item')
      return
    }
    for (const line of lines) {
      if (!line.productId || !(Number(line.quantity) > 0)) {
        setError('Each line needs a product and positive quantity')
        return
      }
    }

    const payload = {
      supplierId,
      explanation: explanation.trim() || undefined,
      lines: lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
        scale: line.scale || 'unit',
      })),
      printAfter: andPrint,
    }
    console.debug('[GenerateOrderDialog] submit', payload)
    const result = await onSubmit?.(payload)
    if (result?.success) onOpenChange?.(false)
    else if (result?.error) setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty({ supplierId, lines, explanation })}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate order</DialogTitle>
          <DialogDescription>
            Select a supplier and one or more catalog items. SMS to representative is Phase 2.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="po-supplier">Name of company</Label>
            <NativeSelect
              id="po-supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </NativeSelect>
            {selectedSupplier ? (
              <p className="text-xs text-slate-500">
                Rep: {selectedSupplier.representativeName || '—'} ·{' '}
                {selectedSupplier.representativePhone || '—'}
              </p>
            ) : null}
            {!suppliers.length ? (
              <p className="text-[11px] text-amber-700">
                No suppliers — add one on the Suppliers page first.
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={addLine}
                disabled={!products.length}
              >
                <Plus className="size-3.5" />
                Add item
              </Button>
            </div>
            {!products.length ? (
              <p className="text-xs text-slate-400">Create single products before ordering.</p>
            ) : null}
            <div className="space-y-2">
              {lines.map((line, index) => {
                const product = products.find((p) => p.id === line.productId)
                return (
                  <div
                    key={`${line.productId}-${index}`}
                    className="grid gap-2 rounded-xl border border-border bg-slate-50/80 p-3 sm:grid-cols-[1fr_5rem_6rem_auto]"
                  >
                    <NativeSelect
                      value={line.productId}
                      onChange={(e) => patchLine(index, 'productId', e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.itemCode}) — last {money(p.purchasePrice)}
                        </option>
                      ))}
                    </NativeSelect>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => patchLine(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitCost}
                      onChange={(e) => patchLine(index, 'unitCost', e.target.value)}
                      placeholder="Price"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="cursor-pointer text-red-600"
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <p className="text-[11px] text-slate-400 sm:col-span-4">
                      Scale: {line.scale}
                      {product
                        ? ` · Catalog last purchase ${money(product.purchasePrice)}`
                        : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po-explain">
              Explanation (optional — why price increased; used when deal closes)
            </Label>
            <Textarea
              id="po-explain"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Optional note for price changes"
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <DialogCancelButton className="cursor-pointer" />
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={loading}
            onClick={() => handleSave(false)}
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            className="cursor-pointer text-white"
            style={{ background: BRAND.purple }}
            disabled={loading}
            onClick={() => handleSave(true)}
          >
            Save & PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
