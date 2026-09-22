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

const ADJ_FIELD_IDS = {
  productId: 'adj-product',
  scale: 'adj-scale',
  quantity: 'adj-quantity',
  reason: 'adj-reason',
}

const ADJ_FIELD_ORDER = ['productId', 'scale', 'quantity', 'reason']

// Create / edit stock adjustment (reason required).
export function AdjustmentDialog({
  open,
  onOpenChange,
  mode = 'create',
  initial = null,
  catalog,
  loading = false,
  onSubmit,
}) {
  const parents = catalog?.parents || []
  const childrenByParent = catalog?.childrenByParent
  const isEdit = mode === 'edit'

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
    () => ({
      categoryId,
      subcategoryId,
      productId,
      scale,
      quantity,
      reason,
    }),
    [categoryId, subcategoryId, productId, scale, quantity, reason],
  )

  const subs = useMemo(() => {
    if (!categoryId || !childrenByParent?.get) return []
    return childrenByParent.get(categoryId) || []
  }, [categoryId, childrenByParent])

  useEffect(() => {
    if (!open) return
    resetErrors()
    if (isEdit && initial) {
      const snapshot = {
        categoryId: '',
        subcategoryId: '',
        productId: initial.productId || '',
        scale: initial.scale || 'unit',
        quantity: String(initial.quantity ?? 1),
        reason: initial.reason || '',
      }
      setProductId(snapshot.productId)
      setScale(snapshot.scale)
      setQuantity(snapshot.quantity)
      setReason(snapshot.reason)
      setCategoryId('')
      setSubcategoryId('')
      setProducts([])
      captureBaseline(snapshot)
      return
    }
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
    setProductId(snapshot.productId)
    setScale(snapshot.scale)
    setQuantity(snapshot.quantity)
    setReason(snapshot.reason)
    setProducts([])
    captureBaseline(snapshot)
  }, [open, isEdit, initial])

  useEffect(() => {
    if (!open || isEdit) return
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
  }, [open, isEdit, categoryId, subcategoryId])

  function validateAdjustmentForm() {
    const errors = {}
    if (!isEdit && !productId) errors.productId = 'Select a product'
    if (!scale || quantity === '' || Number.isNaN(Number(quantity))) {
      errors.quantity = 'Enter a valid quantity and scale'
    } else if (Number(quantity) === 0) {
      errors.quantity = 'Adjustment quantity cannot be zero'
    }
    if (!reason || reason.trim().length < 3) {
      errors.reason = 'Reason is required (min 3 characters)'
    }
    return errors
  }

  async function handleSave() {
    const errors = validateAdjustmentForm()
    if (Object.keys(errors).length) {
      applyErrors(errors, ADJ_FIELD_IDS, ADJ_FIELD_ORDER)
      return
    }
    resetErrors()
    const payload = isEdit
      ? { quantity: Number(quantity), reason: reason.trim() }
      : {
          productId,
          scale,
          quantity: Number(quantity),
          reason: reason.trim(),
        }
    try {
      const result = await onSubmit?.(payload)
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Save failed. Please try again.')
    } catch (err) {
      setFormError(err?.message || 'Save failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(formSnapshot)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit adjustment' : 'Add adjustment'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update quantity or reason. On-hand stock will be recalculated.'
              : 'Positive qty increases stock; negative decreases it. Reason required.'}
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        {!isEdit ? (
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
              <Label htmlFor="adj-product">Product</Label>
              <NativeSelect
                id="adj-product"
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
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (on hand: {p.quantity})
                  </option>
                ))}
              </NativeSelect>
              {!products.length ? (
                <p className="text-xs text-amber-700">No products match these filters.</p>
              ) : null}
              <FieldError message={fieldErrors.productId} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            {initial?.productName || 'Product'} · {initial?.itemCode || ''}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {!isEdit ? (
            <div className="space-y-1.5">
              <Label htmlFor="adj-scale">Scale</Label>
              <NativeSelect
                id="adj-scale"
                value={scale}
                onChange={(e) => {
                  setScale(e.target.value)
                  clearField('scale')
                  clearField('quantity')
                }}
                aria-invalid={Boolean(fieldErrors.scale)}
                className={fieldErrorClass(fieldErrors.scale)}
              >
                {SCALE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={fieldErrors.scale} />
            </div>
          ) : null}
          <div className={`space-y-1.5 ${isEdit ? 'col-span-2' : ''}`}>
            <Label htmlFor="adj-quantity">Quantity</Label>
            <Input
              id="adj-quantity"
              type="number"
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
          <Label htmlFor="adj-reason">Reason</Label>
          <Textarea
            id="adj-reason"
            rows={3}
            value={reason}
            placeholder="Why is this adjustment needed?"
            onChange={(e) => {
              setReason(e.target.value)
              clearField('reason')
            }}
            aria-invalid={Boolean(fieldErrors.reason)}
            className={fieldErrorClass(fieldErrors.reason)}
          />
          <FieldError message={fieldErrors.reason} />
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
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
