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
import { DAMAGED_LOCATIONS } from '@/lib/mapStockMovement'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import {
  fetchControlProductOptions,
  fetchEmployeeLookups,
} from '@/hooks/useInventoryControl'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const DMG_FIELD_IDS = {
  productId: 'damaged-product',
  quantity: 'damaged-quantity',
  damagedByUserId: 'damaged-by',
  damagedLocation: 'damaged-location',
  reason: 'damaged-reason',
}

const DMG_FIELD_ORDER = [
  'productId',
  'quantity',
  'damagedByUserId',
  'damagedLocation',
  'reason',
]

// Create / edit damaged item (employee + location + reason required).
export function DamagedDialog({
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
  const [employees, setEmployees] = useState([])
  const [productId, setProductId] = useState('')
  const [scale, setScale] = useState('unit')
  const [quantity, setQuantity] = useState('1')
  const [damagedByUserId, setDamagedByUserId] = useState('')
  const [damagedLocation, setDamagedLocation] = useState('warehouse')
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
      damagedByUserId,
      damagedLocation,
      reason,
    }),
    [
      categoryId,
      subcategoryId,
      productId,
      scale,
      quantity,
      damagedByUserId,
      damagedLocation,
      reason,
    ],
  )

  const subs = useMemo(() => {
    if (!categoryId || !childrenByParent?.get) return []
    return childrenByParent.get(categoryId) || []
  }, [categoryId, childrenByParent])

  useEffect(() => {
    if (!open) return
    resetErrors()
    void fetchEmployeeLookups().then((res) => {
      if (res.success) setEmployees(res.items)
      else setEmployees([])
    })
    if (isEdit && initial) {
      const snapshot = {
        categoryId: '',
        subcategoryId: '',
        productId: initial.productId || '',
        scale: initial.scale || 'unit',
        quantity: String(Math.abs(Number(initial.quantity ?? 1))),
        damagedByUserId: initial.damagedByUserId || '',
        damagedLocation: initial.damagedLocation || 'warehouse',
        reason: initial.reason || '',
      }
      setProductId(snapshot.productId)
      setScale(snapshot.scale)
      setQuantity(snapshot.quantity)
      setDamagedByUserId(snapshot.damagedByUserId)
      setDamagedLocation(snapshot.damagedLocation)
      setReason(snapshot.reason)
      captureBaseline(snapshot)
      return
    }
    const snapshot = {
      categoryId: '',
      subcategoryId: '',
      productId: '',
      scale: 'unit',
      quantity: '1',
      damagedByUserId: '',
      damagedLocation: 'warehouse',
      reason: '',
    }
    setCategoryId(snapshot.categoryId)
    setSubcategoryId(snapshot.subcategoryId)
    setQuantity(snapshot.quantity)
    setDamagedLocation(snapshot.damagedLocation)
    setReason(snapshot.reason)
    setDamagedByUserId(snapshot.damagedByUserId)
    setProductId(snapshot.productId)
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

  async function handleSave() {
    const errors = {}
    if (!isEdit && !productId) errors.productId = 'Select a product'
    if (!(Number(quantity) > 0)) errors.quantity = 'Quantity must be positive'
    if (!damagedByUserId) errors.damagedByUserId = 'Select who damaged the item'
    if (!damagedLocation) errors.damagedLocation = 'Select where it was damaged'
    if (!reason || reason.trim().length < 3) {
      errors.reason = 'Reason is required (min 3 characters)'
    }
    if (Object.keys(errors).length) {
      applyErrors(errors, DMG_FIELD_IDS, DMG_FIELD_ORDER)
      return
    }
    resetErrors()
    const payload = isEdit
      ? {
          quantity: Number(quantity),
          reason: reason.trim(),
          damagedByUserId,
          damagedLocation,
        }
      : {
          productId,
          scale,
          quantity: Number(quantity),
          damagedByUserId,
          damagedLocation,
          reason: reason.trim(),
        }
    const result = await onSubmit?.(payload)
    if (result?.success) onOpenChange?.(false)
    else if (result?.error) setFormError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(formSnapshot)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit damaged item' : 'Add damaged item'}</DialogTitle>
          <DialogDescription>
            Record damage with employee, location, and reason. Stock decreases.
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
              <Label htmlFor="damaged-product">Product</Label>
              <NativeSelect
                id="damaged-product"
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
          </div>
        ) : (
          <p className="text-sm text-slate-600">{initial?.productName || 'Product'}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="damaged-quantity">Quantity</Label>
            <Input
              id="damaged-quantity"
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
          <div className="space-y-1.5">
            <Label htmlFor="damaged-location">Where damaged</Label>
            <NativeSelect
              id="damaged-location"
              value={damagedLocation}
              onChange={(e) => {
                setDamagedLocation(e.target.value)
                clearField('damagedLocation')
              }}
              aria-invalid={Boolean(fieldErrors.damagedLocation)}
              className={fieldErrorClass(fieldErrors.damagedLocation)}
            >
              {DAMAGED_LOCATIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={fieldErrors.damagedLocation} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="damaged-by">Damaged by</Label>
          <NativeSelect
            id="damaged-by"
            value={damagedByUserId}
            onChange={(e) => {
              setDamagedByUserId(e.target.value)
              clearField('damagedByUserId')
            }}
            aria-invalid={Boolean(fieldErrors.damagedByUserId)}
            className={fieldErrorClass(fieldErrors.damagedByUserId)}
          >
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.userId} value={e.userId}>
                {e.fullName || e.email}
                {e.designation ? ` · ${e.designation}` : ''}
              </option>
            ))}
          </NativeSelect>
          {!employees.length ? (
            <p className="text-xs text-amber-700">
              No employees in lookup. Add staff first, or check staff:lookup permission.
            </p>
          ) : null}
          <FieldError message={fieldErrors.damagedByUserId} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="damaged-reason">Reason</Label>
          <Textarea
            id="damaged-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              clearField('reason')
            }}
            placeholder="Describe the damage…"
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
