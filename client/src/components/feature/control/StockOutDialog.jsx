import { useEffect, useMemo, useState } from 'react'
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
import { FieldError } from '@/components/shared/FieldError'
import { BRAND } from '@/lib/constants'
import { SCALE_OPTIONS } from '@/lib/mapProduct'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { fetchControlProductOptions } from '@/hooks/useInventoryControl'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const OUT_FIELD_IDS = { productId: 'stockout-product', quantity: 'stockout-quantity' }
const OUT_FIELD_ORDER = ['productId', 'quantity']

// Stock-out create dialog.

export function StockOutDialog({
  open,
  onOpenChange,
  catalog,
  loading = false,
  onSubmit,
}) {
  const parents = catalog?.parents || []
  const childrenByParent = catalog?.childrenByParent

  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [scale, setScale] = useState('unit')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const formSnapshot = useMemo(
    () => ({ categoryId, subcategoryId, productId, scale, quantity, reason }),
    [categoryId, subcategoryId, productId, scale, quantity, reason],
  )

  const subs = useMemo(() => {
    if (!categoryId || !childrenByParent?.get) return []
    return childrenByParent.get(categoryId) || []
  }, [categoryId, childrenByParent])

  useEffect(() => {
    if (!open) return
    resetErrors()
    const snapshot = {
      categoryId: '',
      subcategoryId: '',
      productId: '',
      scale: 'unit',
      quantity: '1',
      reason: '',
    }
    setCategoryId(snapshot.categoryId)
    setSubcategoryId(snapshot.subcategoryId)
    setQuantity(snapshot.quantity)
    setReason(snapshot.reason)
    setProductId(snapshot.productId)
    setProducts([])
    captureBaseline(snapshot)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetchControlProductOptions({
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      limit: 50,
    }).then((res) => {
      if (cancelled || !res.success) return
      setProducts(res.items)
      setProductId((prev) => (res.items.some((p) => p.id === prev) ? prev : ''))
    })
    return () => {
      cancelled = true
    }
  }, [open, categoryId, subcategoryId])

  async function handleSave() {
    const errors = {}
    if (!productId) errors.productId = 'Select a product'
    if (!(Number(quantity) > 0)) errors.quantity = 'Quantity must be positive'
    if (Object.keys(errors).length) {
      applyErrors(errors, OUT_FIELD_IDS, OUT_FIELD_ORDER)
      return
    }
    resetErrors()
    const payload = {
      productId,
      scale,
      quantity: Number(quantity),
      reason: reason.trim() || undefined,
    }
    const result = await onSubmit?.(payload)
    if (result?.success) onOpenChange?.(false)
    else if (result?.error) setFormError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(formSnapshot)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add stock out</DialogTitle>
          <DialogDescription>Remove stock from on-hand inventory.</DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <NativeSelect
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setSubcategoryId('')
              }}
            >
              <option value="">All</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Sub category</Label>
            <NativeSelect
              value={subcategoryId}
              disabled={!categoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
            >
              <option value="">All</option>
              {subs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="stockout-product">Product</Label>
            <NativeSelect
              id="stockout-product"
              value={productId}
              onChange={(e) => {
                const id = e.target.value
                setProductId(id)
                clearField('productId')
                const p = products.find((x) => x.id === id)
                if (p) setScale(p.scale || 'unit')
              }}
              aria-invalid={Boolean(fieldErrors.productId)}
              className={fieldErrorClass(fieldErrors.productId)}
            >
              {!products.length ? <option value="">No products</option> : null}
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (on hand: {p.quantity})
                </option>
              ))}
            </NativeSelect>
            <FieldError message={fieldErrors.productId} />
          </div>
          <div className="space-y-1.5">
            <Label>Scale</Label>
            <NativeSelect value={scale} onChange={(e) => setScale(e.target.value)}>
              {SCALE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stockout-quantity">Quantity</Label>
            <Input
              id="stockout-quantity"
              type="number"
              min="0.001"
              step="any"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value)
                clearField('quantity')
              }}
              aria-invalid={Boolean(fieldErrors.quantity)}
              className={fieldErrorClass(fieldErrors.quantity)}
            />
            <FieldError message={fieldErrors.quantity} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Reason (optional)</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <DialogFooter>
          <DialogCancelButton disabled={loading} />
          <Button
            type="button"
            className="text-white"
            style={{ background: BRAND.purple }}
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? 'Saving…' : 'Save stock-out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
