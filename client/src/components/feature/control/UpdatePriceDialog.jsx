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
import { FieldError } from '@/components/shared/FieldError'
import { BRAND } from '@/lib/constants'
import { fetchControlProductDetail } from '@/hooks/useInventoryControl'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'

const FIELD_IDS = {
  purchasePrice: 'upd-price-purchase',
  sellingPrice: 'upd-price-selling',
}

// Inline Update Price — purchase + selling for the row product/variant
export function UpdatePriceDialog({
  open,
  onOpenChange,
  row = null,
  loading = false,
  onSubmit,
}) {
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [loadingProduct, setLoadingProduct] = useState(false)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const formSnapshot = useMemo(
    () => ({ purchasePrice, sellingPrice }),
    [purchasePrice, sellingPrice],
  )

  useEffect(() => {
    if (!open || !row?.productId) return undefined
    let cancelled = false

    void (async () => {
      resetErrors()
      await Promise.resolve()
      if (cancelled) return
      setLoadingProduct(true)
      const res = await fetchControlProductDetail(row.productId)
      if (cancelled) return
      const product = res.success ? res.data : null
      const purchase =
        product?.purchasePrice != null ? String(product.purchasePrice) : ''
      const selling =
        product?.sellingPrice != null ? String(product.sellingPrice) : ''
      setPurchasePrice(purchase)
      setSellingPrice(selling)
      setLoadingProduct(false)
      captureBaseline({ purchasePrice: purchase, sellingPrice: selling })
    })()

    return () => {
      cancelled = true
    }
  }, [open, row?.productId, resetErrors, captureBaseline])

  async function handleSave() {
    resetErrors()
    const purchase = Number(purchasePrice)
    const selling = Number(sellingPrice)
    const errors = {}
    if (!Number.isFinite(purchase) || purchase < 0) {
      errors.purchasePrice = 'Enter a valid purchase price'
    }
    if (!Number.isFinite(selling) || selling < 0) {
      errors.sellingPrice = 'Enter a valid selling price'
    }
    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, ['purchasePrice', 'sellingPrice'])
      return
    }
    if (!row?.productId) {
      setFormError('Missing product')
      return
    }
    const result = await onSubmit?.({
      productId: row.productId,
      purchasePrice: purchase,
      sellingPrice: selling,
    })
    if (result && result.success === false) {
      setFormError(result.error || 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(formSnapshot)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update price</DialogTitle>
          <DialogDescription>
            Prices for {row?.productName || 'this item'}
            {row?.variantLabel ? ` · ${row.variantLabel}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={FIELD_IDS.purchasePrice}>Purchase price</Label>
            <Input
              id={FIELD_IDS.purchasePrice}
              type="number"
              min="0"
              step="0.01"
              disabled={loadingProduct}
              value={purchasePrice}
              onChange={(e) => {
                clearField('purchasePrice')
                setPurchasePrice(e.target.value)
              }}
              className={fieldErrorClass(fieldErrors.purchasePrice)}
            />
            <FieldError message={fieldErrors.purchasePrice} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={FIELD_IDS.sellingPrice}>Selling price</Label>
            <Input
              id={FIELD_IDS.sellingPrice}
              type="number"
              min="0"
              step="0.01"
              disabled={loadingProduct}
              value={sellingPrice}
              onChange={(e) => {
                clearField('sellingPrice')
                setSellingPrice(e.target.value)
              }}
              className={fieldErrorClass(fieldErrors.sellingPrice)}
            />
            <FieldError message={fieldErrors.sellingPrice} />
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

export default UpdatePriceDialog
