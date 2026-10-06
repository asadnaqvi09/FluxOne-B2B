import { useEffect, useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/shared/FieldError'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { TaxMultiSelect } from '@/components/feature/products/TaxMultiSelect'
import { BRAND } from '@/lib/constants'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { fetchControlProductDetail } from '@/hooks/useInventoryControl'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'

const FIELD_IDS = {
  quantity: 'upd-stock-qty',
  purchasePrice: 'upd-stock-purchase',
  sellingPrice: 'upd-stock-selling',
  notes: 'upd-stock-notes',
}

// Inline Update Stock — add qty + optional price/tax/notes for a row product
export function UpdateStockDialog({
  open,
  onOpenChange,
  row = null,
  loading = false,
  onSubmit,
}) {
  const [quantity, setQuantity] = useState('1')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [taxIds, setTaxIds] = useState([])
  const [taxes, setTaxes] = useState([])
  const [loadingProduct, setLoadingProduct] = useState(false)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const formSnapshot = useMemo(
    () => ({ quantity, purchasePrice, sellingPrice, notes, taxIds }),
    [quantity, purchasePrice, sellingPrice, notes, taxIds],
  )

  useEffect(() => {
    if (!open || !row?.productId) return undefined
    let cancelled = false

    void (async () => {
      resetErrors()
      await Promise.resolve()
      if (cancelled) return
      setQuantity('1')
      setNotes('')
      setLoadingProduct(true)

      const [detailRes, taxRes] = await Promise.all([
        fetchControlProductDetail(row.productId),
        apiClient.get(endpoints.products.taxes),
      ])
      if (cancelled) return

      const product = detailRes.success ? detailRes.data : null
      const purchase =
        product?.purchasePrice != null ? String(product.purchasePrice) : ''
      const selling =
        product?.sellingPrice != null ? String(product.sellingPrice) : ''
      const nextTaxIds = Array.isArray(product?.taxIds) ? product.taxIds : []
      const taxList = Array.isArray(taxRes?.data)
        ? taxRes.data
        : Array.isArray(taxRes?.data?.items)
          ? taxRes.data.items
          : []

      setPurchasePrice(purchase)
      setSellingPrice(selling)
      setTaxIds(nextTaxIds)
      setTaxes(taxList)
      setLoadingProduct(false)
      captureBaseline({
        quantity: '1',
        purchasePrice: purchase,
        sellingPrice: selling,
        notes: '',
        taxIds: nextTaxIds,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [open, row?.productId, resetErrors, captureBaseline])

  async function handleSave() {
    resetErrors()
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      applyErrors({ quantity: 'Enter a positive quantity' }, FIELD_IDS, ['quantity'])
      return
    }
    if (!row?.productId) {
      setFormError('Missing product')
      return
    }

    const payload = {
      productId: row.productId,
      scale: row.scale || 'unit',
      quantity: qty,
      unitCost:
        purchasePrice === '' || purchasePrice == null
          ? undefined
          : Number(purchasePrice),
      sellingPrice:
        sellingPrice === '' || sellingPrice == null
          ? undefined
          : Number(sellingPrice),
      taxIds,
      notes: notes.trim() || undefined,
      reason: notes.trim() || undefined,
    }

    const result = await onSubmit?.(payload)
    if (result && result.success === false) {
      setFormError(result.error || 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(formSnapshot)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update stock</DialogTitle>
          <DialogDescription>
            Add stock for {row?.productName || 'this item'}
            {row?.variantLabel ? ` · ${row.variantLabel}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          ) : null}
          {loadingProduct ? (
            <p className="text-sm text-slate-500">Loading product…</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={FIELD_IDS.quantity}>Quantity</Label>
            <WholeNumberInput
              id={FIELD_IDS.quantity}
              value={quantity}
              min={1}
              onChange={(e) => {
                clearField('quantity')
                setQuantity(e.target.value)
              }}
              className={fieldErrorClass(fieldErrors.quantity)}
            />
            <FieldError message={fieldErrors.quantity} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={FIELD_IDS.purchasePrice}>Purchase price</Label>
              <Input
                id={FIELD_IDS.purchasePrice}
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={FIELD_IDS.sellingPrice}>Selling price</Label>
              <Input
                id={FIELD_IDS.sellingPrice}
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tax</Label>
            <TaxMultiSelect taxes={taxes} value={taxIds} onChange={setTaxIds} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={FIELD_IDS.notes}>Notes</Label>
            <Textarea
              id={FIELD_IDS.notes}
              value={notes}
              rows={2}
              placeholder="Optional notes"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogCancelButton />
          <Button
            type="button"
            variant="brand"
            style={{ background: BRAND.purple }}
            disabled={loading || loadingProduct}
            onClick={() => void handleSave()}
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UpdateStockDialog
