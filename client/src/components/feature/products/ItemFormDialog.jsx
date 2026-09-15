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
import { BundleItemPicker } from '@/components/feature/products/BundleItemPicker'
import { TaxMultiSelect } from '@/components/feature/products/TaxMultiSelect'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { BRAND } from '@/lib/constants'
import { PRODUCT_TYPES, SCALE_OPTIONS } from '@/lib/mapProduct'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { useItemScales } from '@/hooks/useItemScales'

const EMPTY = {
  name: '',
  categoryId: '',
  subcategoryId: '',
  type: PRODUCT_TYPES.SINGLE,
  scale: 'unit',
  description: '',
  purchasePrice: '',
  sellingPrice: '',
  taxIds: [],
  offerId: '',
  discountPercent: '',
  bundleItems: [],
  image: null,
}

//
// Create / edit single or bundle product.
// Steps: form → confirm → success (create only: itemCode + barcode + print).
//
export function ItemFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  productType = PRODUCT_TYPES.SINGLE,
  initialProduct = null,
  categories = [],
  childrenByParent,
  taxes = [],
  offers = [],
  catalogItems = [],
  catalogItemsLoading = false,
  loading = false,
  onSubmit,
  onPrintBarcode,
}) {
  const isEdit = mode === 'edit'
  const [step, setStep] = useState('form')
  const [form, setForm] = useState(EMPTY)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)
  const [created, setCreated] = useState(null)
  const [imageWarning, setImageWarning] = useState(null)
  const { captureBaseline, isDirty } = useFormBaseline(open)
  const { scales: scaleOptions } = useItemScales({ enabled: open })

  const type = isEdit ? form.type : productType
  const isBundle = type === PRODUCT_TYPES.BUNDLE

  const scaleChoices = useMemo(() => {
    const current = String(form.scale || '').trim()
    const merged = [...scaleOptions]
    if (current && !merged.includes(current)) merged.unshift(current)
    return merged.length > 0 ? merged : SCALE_OPTIONS
  }, [scaleOptions, form.scale])

  const subcategories = useMemo(() => {
    if (!form.categoryId || !childrenByParent) return []
    return (childrenByParent.get(form.categoryId) || []).filter((row) => row.isActive !== false)
  }, [childrenByParent, form.categoryId])

  // Reset dialog when opened / mode changes (do not depend on categories — avoids wiping typed fields)
  useEffect(() => {
    if (!open) return
    setError(null)
    setImageWarning(null)
    setCreated(null)
    setStep('form')
    setConfirmed(false)
    if (isEdit && initialProduct) {
      const nextForm = {
        name: initialProduct.name || '',
        categoryId: initialProduct.categoryId || '',
        subcategoryId: initialProduct.subcategoryId || '',
        type: initialProduct.type || PRODUCT_TYPES.SINGLE,
        scale: initialProduct.scale || 'unit',
        description: initialProduct.description || '',
        purchasePrice: initialProduct.purchasePrice ?? '',
        sellingPrice: initialProduct.sellingPrice ?? '',
        taxIds: initialProduct.taxIds || [],
        offerId: initialProduct.offerId || '',
        discountPercent: initialProduct.discountPercent || '',
        bundleItems: (initialProduct.bundleItems || []).map((row) => ({
          itemId: row.itemId,
          quantity: Number(row.quantity || 1),
        })),
        image: null,
      }
      setForm(nextForm)
      captureBaseline(nextForm)
    } else {
      const nextForm = {
        ...EMPTY,
        type: productType,
        categoryId: '',
      }
      setForm(nextForm)
      captureBaseline(nextForm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categories seeded in separate effect
  }, [open, isEdit, initialProduct, productType])

  // Bundle purchase/selling prices = sum of selected single-item prices × qty
  useEffect(() => {
    if (!open || !isBundle) return
    let purchase = 0
    let selling = 0
    for (const row of form.bundleItems) {
      const item = catalogItems.find((entry) => entry.id === row.itemId)
      if (!item) continue
      const qty = Number(row.quantity) || 1
      purchase += Number(item.purchasePrice || 0) * qty
      selling += Number(item.sellingPrice || 0) * qty
    }
    const nextPurchase = purchase > 0 ? String(Math.round(purchase * 100) / 100) : ''
    const nextSelling = selling > 0 ? String(Math.round(selling * 100) / 100) : ''
    setForm((prev) => {
      if (prev.purchasePrice === nextPurchase && prev.sellingPrice === nextSelling) return prev
      return { ...prev, purchasePrice: nextPurchase, sellingPrice: nextSelling }
    })
  }, [open, isBundle, form.bundleItems, catalogItems])

  // Re-seed categoryId only when create form still has none and parents load async
  // useEffect(() => {
  //   if (!open || isEdit) return
  //   if (form.categoryId) return
  //   if (!categories[0]?.id) return
  //   console.debug('[ItemFormDialog] seeding categoryId after catalog load', categories[0].id)
  //   setForm((prev) => ({ ...prev, categoryId: categories[0].id }))
  // }, [open, isEdit, categories, form.categoryId])

  function patch(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'categoryId') next.subcategoryId = ''
      return next
    })
  }

  function validate() {
    if (!form.name.trim()) return 'Name is required'
    if (!form.scale) return 'Scale is required'

    if (isBundle) {
      if (!form.bundleItems || form.bundleItems.length === 0) {
        return 'Select at least one item for this bundle'
      }
      for (const row of form.bundleItems) {
        if (!row.itemId) return 'Select an item for each bundle line'
        if (!row.quantity || Number(row.quantity) <= 0) {
          return 'Quantity must be greater than 0 for each selected item'
        }
      }
      return null
    }

    if (!form.categoryId) {
      return categories.length
        ? 'Category is required'
        : 'Create a category first (Categories page), then add products'
    }
    if (form.purchasePrice === '' || Number(form.purchasePrice) < 0) {
      return 'Purchase price is required'
    }
    if (form.sellingPrice === '' || Number(form.sellingPrice) < 0) {
      return 'Selling price is required'
    }
    return null
  }

  function goReview(event) {
    event.preventDefault()
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setConfirmed(false)
    setStep('confirm')
  }

  async function handleConfirm() {
    if (!confirmed) {
      setError('Please confirm before saving')
      return
    }
    setError(null)
    const payload = {
      name: form.name,
      type,
      scale: form.scale,
      description: form.description,
      taxIds: form.taxIds,
      offerId: form.offerId || undefined,
      discountPercent:
        form.discountPercent === '' ? undefined : Number(form.discountPercent),
      image: form.image,
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      bundleItems:
        isBundle
          ? form.bundleItems.map((row) => ({
              itemId: row.itemId,
              quantity: Number(row.quantity),
            }))
          : undefined,
    }

    if (!isBundle) {
      payload.categoryId = form.categoryId
      payload.subcategoryId =
        form.subcategoryId === '' || form.subcategoryId == null ? null : form.subcategoryId
    }
    console.debug('[ItemFormDialog] submit payload keys', {
      categoryId: payload.categoryId,
      subcategoryId: payload.subcategoryId,
      offerId: payload.offerId,
      taxIds: payload.taxIds,
      type: payload.type,
    })
    const result = await onSubmit?.(payload)
    if (result?.success) {
      const product = result.data || null
      if (!isEdit && product?.id) {
        setCreated(product)
        setImageWarning(result.imageWarning || null)
        setStep('success')
        return
      }
      onOpenChange?.(false)
    } else if (result?.error) {
      setError(result.error)
      setStep('form')
    }
  }

  const title =
    isEdit
      ? 'Edit product'
      : type === PRODUCT_TYPES.BUNDLE
        ? 'Add bundle'
        : 'Add single item'

  const dirty =
    step === 'success' ? false : isDirty(form) || step === 'confirm' || Boolean(confirmed)

  const bundleReviewLines = useMemo(() => {
    if (!isBundle) return []
    return form.bundleItems
      .map((row) => {
        const item = catalogItems.find((entry) => entry.id === row.itemId)
        if (!item) return null
        return `${item.name} × ${row.quantity}`
      })
      .filter(Boolean)
  }, [isBundle, form.bundleItems, catalogItems])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={dirty}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? 'Fill product details. Item code & barcode are generated by the system on create.'
              : step === 'confirm'
                ? 'Review details and confirm before saving.'
                : 'Product saved. Item code and barcode are ready.'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {step === 'form' ? (
          <form className="space-y-4" onSubmit={goReview}>
            {isBundle ? (
              <>
                <div className="space-y-4">
                  {!isEdit ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="product-item-code">Item code</Label>
                      <Input
                        id="product-item-code"
                        value=""
                        disabled
                        placeholder="Generated after save"
                        className="bg-slate-50 font-mono text-slate-500"
                      />
                      <p className="text-[11px] text-slate-400">
                        System-owned — assigned automatically when you create the bundle.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="product-item-code-edit">Item code</Label>
                      <Input
                        id="product-item-code-edit"
                        value={initialProduct?.itemCode || '—'}
                        disabled
                        className="bg-slate-50 font-mono"
                      />
                    </div>
                  )}

                  <BundleItemPicker
                    catalogItems={catalogItems}
                    value={form.bundleItems}
                    excludeId={initialProduct?.id}
                    loading={catalogItemsLoading}
                    onChange={(bundleItems) => patch('bundleItems', bundleItems)}
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="product-name">Name</Label>
                    <Input
                      id="product-name"
                      value={form.name}
                      onChange={(event) => patch('name', event.target.value)}
                      placeholder="Bundle name"
                    />
                  </div>

                  <ImageUploadField
                    id="product-image"
                    label="Image"
                    optionalLabel="(optional)"
                    value={form.image}
                    existingImageUrl={isEdit ? initialProduct?.imageUrl : null}
                    onChange={(file) => patch('image', file)}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="product-scale">Scale</Label>
                      <NativeSelect
                        id="product-scale"
                        value={form.scale}
                        onChange={(event) => patch('scale', event.target.value)}
                      >
                        <option value="">Select Scale</option>
                        {scaleChoices.map((scale) => (
                          <option key={scale} value={scale}>
                            {scale}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="product-barcode-hint">Barcode</Label>
                      <Input
                        id="product-barcode-hint"
                        value={isEdit ? initialProduct?.barcode || '—' : ''}
                        disabled
                        placeholder="System auto-generated on create"
                        className="bg-slate-50 font-mono text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Taxes (multiple)</Label>
                    <TaxMultiSelect
                      taxes={taxes}
                      value={form.taxIds}
                      onChange={(taxIds) => patch('taxIds', taxIds)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="product-offer">Offer</Label>
                      <NativeSelect
                        id="product-offer"
                        value={form.offerId}
                        onChange={(event) => patch('offerId', event.target.value)}
                      >
                        <option value="">Select Offer</option>
                        {offers.map((offer) => (
                          <option key={offer.id} value={offer.id}>
                            {offer.name}
                            {offer.percent != null ? ` (${offer.percent}%)` : ''}
                          </option>
                        ))}
                      </NativeSelect>
                      {!offers.length ? (
                        <p className="text-[11px] text-slate-400">No offers configured yet.</p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="product-discount">Discount %</Label>
                      <Input
                        id="product-discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.discountPercent}
                        onChange={(event) => patch('discountPercent', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="product-description">Description (optional)</Label>
                    <Textarea
                      id="product-description"
                      value={form.description}
                      onChange={(event) => patch('description', event.target.value)}
                      placeholder="Explain this bundle"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {!isEdit ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="product-item-code">Item code</Label>
                    <Input
                      id="product-item-code"
                      value=""
                      disabled
                      placeholder="Generated after save"
                      className="bg-slate-50 font-mono text-slate-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      System-owned — assigned automatically when you create the product.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="product-item-code-edit">Item code</Label>
                    <Input
                      id="product-item-code-edit"
                      value={initialProduct?.itemCode || '—'}
                      disabled
                      className="bg-slate-50 font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="product-name">Name</Label>
                  <Input
                    id="product-name"
                    value={form.name}
                    onChange={(event) => patch('name', event.target.value)}
                    placeholder="Product name"
                  />
                </div>

                <ImageUploadField
                  id="product-image"
                  label="Image"
                  optionalLabel="(optional)"
                  value={form.image}
                  existingImageUrl={isEdit ? initialProduct?.imageUrl : null}
                  onChange={(file) => patch('image', file)}
                  className="sm:col-span-2"
                />

                <div className="space-y-1.5">
                  <Label htmlFor="product-scale">Scale</Label>
                  <NativeSelect
                    id="product-scale"
                    value={form.scale}
                    onChange={(event) => patch('scale', event.target.value)}
                  >
                    <option value="">Select Scale</option>
                    {scaleChoices.map((scale) => (
                      <option key={scale} value={scale}>
                        {scale}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="product-barcode-hint">Barcode</Label>
                  <Input
                    id="product-barcode-hint"
                    value={isEdit ? initialProduct?.barcode || '—' : ''}
                    disabled
                    placeholder="System auto-generated on create"
                    className="bg-slate-50 font-mono text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="product-category">Category</Label>
                  <NativeSelect
                    id="product-category"
                    value={form.categoryId}
                    onChange={(event) => patch('categoryId', event.target.value)}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </NativeSelect>
                  {!categories.length ? (
                    <p className="text-[11px] text-amber-700">
                      No categories yet — add one on the Categories page first.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-subcategory">Sub category</Label>
                  <NativeSelect
                    id="product-subcategory"
                    value={form.subcategoryId}
                    onChange={(event) => patch('subcategoryId', event.target.value)}
                    disabled={!subcategories.length}
                  >
                    <option value="">Select Sub Category</option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="product-purchase">Purchase price</Label>
                  <Input
                    id="product-purchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={(event) => patch('purchasePrice', event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="product-selling">Selling price</Label>
                  <Input
                    id="product-selling"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(event) => patch('sellingPrice', event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="product-discount">Discount %</Label>
                  <Input
                    id="product-discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.discountPercent}
                    onChange={(event) => patch('discountPercent', event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="product-offer">Offer</Label>
                  <NativeSelect
                    id="product-offer"
                    value={form.offerId}
                    onChange={(event) => patch('offerId', event.target.value)}
                  >
                    <option value="">Select Offer</option>
                    {offers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.name}
                        {offer.percent != null ? ` (${offer.percent}%)` : ''}
                      </option>
                    ))}
                  </NativeSelect>
                  {!offers.length ? (
                    <p className="text-[11px] text-slate-400">No offers configured yet.</p>
                  ) : null}
                </div>
              </div>
            )}

            {!isBundle ? (
              <>
                <div className="space-y-1.5">
                  <Label>Taxes (multiple)</Label>
                  <TaxMultiSelect
                    taxes={taxes}
                    value={form.taxIds}
                    onChange={(taxIds) => patch('taxIds', taxIds)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="product-description">Description (optional)</Label>
                  <Textarea
                    id="product-description"
                    value={form.description}
                    onChange={(event) => patch('description', event.target.value)}
                    placeholder="Explain this product / item"
                  />
                </div>
              </>
            ) : null}

            <DialogFooter>
              <DialogCancelButton className="cursor-pointer" />
              <Button
                type="submit"
                className="cursor-pointer text-white"
                style={{ background: BRAND.purple }}
              >
                Review & confirm
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === 'confirm' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm">
              <p>
                <span className="text-slate-500">Name:</span>{' '}
                <span className="font-semibold">{form.name}</span>
              </p>
              {!isBundle ? (
                <p className="mt-1 capitalize">
                  <span className="text-slate-500">Type:</span> {type}
                </p>
              ) : null}
              <p className="mt-1">
                <span className="text-slate-500">Scale:</span> {form.scale}
              </p>
              {!isBundle && form.categoryId ? (
                <p className="mt-1">
                  <span className="text-slate-500">Category:</span>{' '}
                  {categories.find((cat) => cat.id === form.categoryId)?.name || '—'}
                  {form.subcategoryId
                    ? ` / ${subcategories.find((sub) => sub.id === form.subcategoryId)?.name || '—'}`
                    : ''}
                </p>
              ) : null}
              {!isBundle ? (
                <p className="mt-1">
                  <span className="text-slate-500">Purchase / Selling:</span>{' '}
                  {form.purchasePrice} / {form.sellingPrice}
                </p>
              ) : null}
              {isBundle ? (
                <div className="mt-2">
                  <p className="text-slate-500">Bundle items:</p>
                  {bundleReviewLines.length ? (
                    <ul className="mt-1 list-inside list-disc text-slate-800">
                      {bundleReviewLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 font-semibold">{form.bundleItems.length} line(s)</p>
                  )}
                </div>
              ) : null}
              {form.taxIds?.length ? (
                <p className="mt-1">
                  <span className="text-slate-500">Taxes:</span>{' '}
                  {form.taxIds
                    .map((id) => taxes.find((tax) => tax.id === id)?.name || id)
                    .join(', ')}
                </p>
              ) : null}
              {form.offerId ? (
                <p className="mt-1">
                  <span className="text-slate-500">Offer:</span>{' '}
                  {offers.find((offer) => offer.id === form.offerId)?.name || '—'}
                </p>
              ) : null}
              {form.discountPercent !== '' && form.discountPercent != null ? (
                <p className="mt-1">
                  <span className="text-slate-500">Discount:</span> {form.discountPercent}%
                </p>
              ) : null}
              {form.description ? (
                <p className="mt-1">
                  <span className="text-slate-500">Description:</span> {form.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-400">
                {isEdit
                  ? 'Review changes before saving.'
                  : 'Item code & barcode will be generated by the system on create.'}
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>I confirm these details are correct and ready to save.</span>
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={loading}
                onClick={() => setStep('form')}
              >
                Back
              </Button>
              <Button
                type="button"
                className="cursor-pointer text-white"
                style={{ background: BRAND.purple }}
                disabled={loading || !confirmed}
                onClick={handleConfirm}
              >
                {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === 'success' && created ? (
          <div className="space-y-4">
            {imageWarning ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {imageWarning}
              </p>
            ) : null}
            <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-800">{created.name}</p>
              <p className="mt-2 font-mono text-xs text-slate-600">
                <span className="text-slate-500">Item code:</span> {created.itemCode || '—'}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-600">
                <span className="text-slate-500">Barcode:</span> {created.barcode || '—'}
              </p>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => onOpenChange?.(false)}
              >
                Done
              </Button>
              <Button
                type="button"
                className="cursor-pointer text-white"
                style={{ background: BRAND.purple }}
                onClick={() => {
                  onPrintBarcode?.(created)
                  onOpenChange?.(false)
                }}
              >
                Download barcode PDF
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
