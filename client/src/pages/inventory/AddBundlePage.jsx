import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { FieldError } from '@/components/shared/FieldError'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { MotionHeader } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProducts } from '@/hooks/useProducts'
import { PRODUCT_TYPES, money, taxIdsForDefaultRate } from '@/lib/mapProduct'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { cn } from '@/lib/utils'

function catalogName(catalog, id) {
  if (!id) return '—'
  const row = (catalog.all || []).find((entry) => entry.id === id)
  return row?.name || '—'
}

/** First component whose on-hand stock cannot cover bundleQty × recipe qty. */
function findInsufficientComponent(lineDetails, bundleQty) {
  if (!lineDetails.length || !Number.isFinite(bundleQty) || bundleQty <= 0) return null
  for (const row of lineDetails) {
    const onHand = Number(row.item.quantity) || 0
    const deduct = bundleQty * (row.qty || 0)
    if (onHand - deduct < 0) {
      return { name: row.item.name || 'item', onHand, deduct }
    }
  }
  return null
}

function stockInsufficientMessage(lineDetails, bundleQty) {
  const bad = findInsufficientComponent(lineDetails, bundleQty)
  if (!bad) return ''
  return `Insufficient stock for ${bad.name}. Available stock: ${bad.onHand}.`
}

export function AddBundlePage() {
  const {
    catalog,
    catalogLoading,
    mutating,
    bundleOptions,
    bundleOptionsLoading,
    loadBundleOptions,
    createProduct,
  } = useProducts({}, { skipList: true })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [status, setStatus] = useState('active')
  const [taxId, setTaxId] = useState('')
  const [offerId, setOfferId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [productId, setProductId] = useState('')
  const [lines, setLines] = useState([])
  const [bundlePrice, setBundlePrice] = useState('')
  const [bundleStock, setBundleStock] = useState('')
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const priceTouched = useRef(false)
  const stockTouched = useRef(false)
  // After user changes tax, do not re-apply tenant default
  const taxTouched = useRef(false)

  useEffect(() => {
    void loadBundleOptions()
  }, [loadBundleOptions])

  // Pre-fill tax from tenant default when catalog loads (user can still clear/override)
  useEffect(() => {
    if (taxTouched.current || taxId) return
    const ids = taxIdsForDefaultRate(catalog.taxes, catalog.defaults?.defaultTaxPercent)
    if (ids[0]) setTaxId(ids[0])
  }, [catalog.taxes, catalog.defaults, taxId])

  const parents = (catalog.parents || []).filter((row) => row.isActive !== false)
  const subcategories = useMemo(() => {
    if (!categoryId) return []
    return (catalog.childrenByParent.get(categoryId) || []).filter((row) => row.isActive !== false)
  }, [catalog.childrenByParent, categoryId])

  const selectedIds = useMemo(() => new Set(lines.map((row) => row.itemId)), [lines])

  const productChoices = useMemo(() => {
    if (!categoryId) return []
    if (subcategories.length && !subcategoryId) return []
    return bundleOptions.filter((item) => {
      if (item.type === PRODUCT_TYPES.BUNDLE) return false
      if (selectedIds.has(item.id)) return false
      if (item.categoryId !== categoryId) return false
      if (subcategories.length && item.subcategoryId !== subcategoryId) return false
      return true
    })
  }, [bundleOptions, categoryId, subcategoryId, subcategories.length, selectedIds])

  const lineDetails = useMemo(
    () =>
      lines
        .map((line) => {
          const item = bundleOptions.find((entry) => entry.id === line.itemId)
          if (!item) return null
          const qty = Number(line.quantity) || 0
          const price = Number(item.sellingPrice) || 0
          return { ...line, item, qty, price, lineTotal: price * qty }
        })
        .filter(Boolean),
    [lines, bundleOptions],
  )

  const autoTotal = useMemo(
    () => Math.round(lineDetails.reduce((sum, row) => sum + row.lineTotal, 0)),
    [lineDetails],
  )

  const maxBundles = useMemo(() => {
    if (!lineDetails.length) return 0
    return lineDetails.reduce((min, row) => {
      const per = row.qty || 1
      const possible = Math.floor((Number(row.item.quantity) || 0) / per)
      return Math.min(min, possible)
    }, Infinity)
  }, [lineDetails])

  const stockQty = Number(bundleStock)
  const stockFieldError = useMemo(() => {
    if (!bundleStock || Number.isNaN(stockQty) || stockQty <= 0) return ''
    return stockInsufficientMessage(lineDetails, stockQty)
  }, [bundleStock, lineDetails, stockQty])

  const stockImpactRows = useMemo(() => {
    if (!lineDetails.length || Number.isNaN(stockQty) || stockQty <= 0) return []
    return lineDetails.map((row) => {
      const onHand = Number(row.item.quantity) || 0
      const deduct = stockQty * (row.qty || 0)
      const remaining = onHand - deduct
      return {
        itemId: row.itemId,
        name: row.item.name,
        deduct,
        remaining,
        insufficient: remaining < 0,
      }
    })
  }, [lineDetails, stockQty])

  useEffect(() => {
    if (priceTouched.current) return
    setBundlePrice(autoTotal > 0 ? String(autoTotal) : '')
  }, [autoTotal])

  useEffect(() => {
    if (stockTouched.current) return
    setBundleStock(maxBundles > 0 ? String(maxBundles) : '')
  }, [maxBundles])

  const selectedTax = (catalog.taxes || []).find((tax) => tax.id === taxId)
  const selectedOffer = (catalog.offers || []).find((offer) => offer.id === offerId)

  function resetPicker() {
    setProductId('')
  }

  function handleCategoryChange(value) {
    setCategoryId(value)
    setSubcategoryId('')
    setProductId('')
  }

  function addItem() {
    if (!productId) {
      setError('Select a product before adding it to the bundle.')
      return
    }
    if (selectedIds.has(productId)) {
      setError('This item is already in the bundle. Increase its quantity instead.')
      return
    }
    setError('')
    setLines((prev) => [...prev, { itemId: productId, quantity: 1 }])
    resetPicker()
  }

  function patchQty(itemId, quantity) {
    setLines((prev) =>
      prev.map((row) => (row.itemId === itemId ? { ...row, quantity: Number(quantity) || 1 } : row)),
    )
  }

  function removeLine(itemId) {
    setLines((prev) => prev.filter((row) => row.itemId !== itemId))
  }

  function resetForm() {
    setName('')
    setDescription('')
    setImage(null)
    setStatus('active')
    setTaxId('')
    setOfferId('')
    setCategoryId('')
    setSubcategoryId('')
    setProductId('')
    setLines([])
    setBundlePrice('')
    setBundleStock('')
    setError('')
    setCreated(null)
    priceTouched.current = false
    stockTouched.current = false
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Bundle name is required.')
      return
    }
    if (lineDetails.length < 2) {
      setError('A bundle must contain at least 2 different items.')
      return
    }
    const price = Number(bundlePrice)
    if (!bundlePrice || Number.isNaN(price) || price <= 0) {
      setError('Bundle price is required and cannot be zero.')
      return
    }
    const stock = Number(bundleStock)
    if (!bundleStock || Number.isNaN(stock) || stock <= 0) {
      setError('Bundle stock quantity is required.')
      return
    }
    const stockMsg = stockInsufficientMessage(lineDetails, stock)
    if (stockMsg) {
      setError(stockMsg)
      return
    }

    const result = await createProduct({
      name: name.trim(),
      type: PRODUCT_TYPES.BUNDLE,
      scale: 'unit',
      description: description.trim(),
      status,
      image,
      sellingPrice: price,
      purchasePrice: 0,
      quantity: stock,
      // Explicit pick or clear → send. Never touched + empty → omit → server default.
      ...(taxTouched.current || taxId
        ? { taxIds: taxId ? [taxId] : [] }
        : {}),
      offerId: offerId || undefined,
      bundleItems: lineDetails.map((row) => ({
        itemId: row.itemId,
        quantity: row.qty,
      })),
    })

    if (!result.success) {
      const message = result.error || 'Could not save the bundle'
      setError(message)
      toastError(message)
      return
    }

    toastSuccess('Bundle created')
    setCreated(result.data || { name })
  }

  if (created) {
    return (
      <div className="space-y-5 pb-8">
        <MotionHeader>
          <PageHeader
            eyebrow="Inventory Manager"
            title="Bundle saved"
            description="This bundle now has its own stock. Component stock was reserved when you saved."
          />
        </MotionHeader>
        <SurfaceCard title={created.name || name} description="Item code and barcode are ready.">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Item code</dt>
              <dd className="font-mono font-semibold text-slate-900">{created.itemCode || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Barcode</dt>
              <dd className="font-mono font-semibold text-slate-900">{created.barcode || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium capitalize text-slate-900">{status}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="brand" onClick={resetForm}>
              Add another bundle
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={PATHS.inventory.products}>Back to products</Link>
            </Button>
          </div>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <form className="space-y-5 pb-8" onSubmit={handleSubmit}>
      <MotionHeader>
        <PageHeader
          eyebrow="Inventory Manager"
          title="Add Bundle"
          description="Combine two or more items into one sellable unit with its own price and stock."
          actions={
            <Button type="button" variant="outline" asChild>
              <Link to={PATHS.inventory.products}>Back to products</Link>
            </Button>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">{error}</p>
      ) : null}

      <SurfaceCard title="Bundle details" description="These fields apply to the bundle as a whole.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bundle-name">Bundle name</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name shown on the invoice and catalog"
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bundle-description">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="bundle-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is included in this bundle"
            />
          </div>

          <ImageUploadField
            id="bundle-image"
            label="Image"
            optionalLabel="(optional, max 4MB)"
            value={image}
            onChange={setImage}
            className="sm:col-span-2"
          />

          <div className="space-y-1.5">
            <Label htmlFor="bundle-offer">Discount / Offer</Label>
            <NativeSelect id="bundle-offer" value={offerId} onChange={(event) => setOfferId(event.target.value)}>
              <option value="">No discount</option>
              {(catalog.offers || []).map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                  {offer.percent ? ` ${offer.percent}%` : ''}
                </option>
              ))}
            </NativeSelect>
            <p className="text-[11px] text-slate-400">
              Dropdown is visible for review. Discount is not saved until confirmation.
              {selectedOffer ? ` Selected: ${selectedOffer.name}.` : ''}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bundle-tax">Tax</Label>
            <NativeSelect
              id="bundle-tax"
              value={taxId}
              onChange={(event) => {
                taxTouched.current = true
                setTaxId(event.target.value)
              }}
            >
              <option value="">No tax</option>
              {(catalog.taxes || []).map((tax) => (
                <option key={tax.id} value={tax.id}>
                  {tax.name}
                  {tax.ratePercent != null ? ` (${tax.ratePercent}%)` : ''}
                </option>
              ))}
            </NativeSelect>
            <p className="text-[11px] text-slate-400">
              Pre-filled from company default tax when set. Clear for tax-exempt, or pick another rate.
              {selectedTax ? ` Selected: ${selectedTax.name}.` : ''}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bundle-status">Status</Label>
            <NativeSelect id="bundle-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
            <p className="text-[11px] text-slate-400">Active bundles are available for sale after save.</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Bundle items"
        description="Filter by category, then subcategory, then product. A bundle needs at least 2 different items."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="bundle-category">Category</Label>
            <NativeSelect
              id="bundle-category"
              value={categoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
              disabled={catalogLoading}
            >
              <option value="">Select category</option>
              {parents.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bundle-subcategory">Sub category</Label>
            <NativeSelect
              id="bundle-subcategory"
              value={subcategoryId}
              onChange={(event) => {
                setSubcategoryId(event.target.value)
                setProductId('')
              }}
              disabled={!categoryId || subcategories.length === 0}
            >
              <option value="">{subcategories.length ? 'Select sub category' : 'No sub categories'}</option>
              {subcategories.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bundle-product">Product</Label>
            <NativeSelect
              id="bundle-product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              disabled={!categoryId || (subcategories.length > 0 && !subcategoryId) || bundleOptionsLoading}
            >
              <option value="">
                {bundleOptionsLoading ? 'Loading products…' : 'Select product'}
              </option>
              {productChoices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="brand" className="w-full" onClick={addItem} disabled={!productId}>
              <Plus className="size-4" />
              Add item
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {lineDetails.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-slate-500">
              No items yet. Add at least 2 products.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Item name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sub category</TableHead>
                  <TableHead>Variant / Scale</TableHead>
                  <TableHead>Qty in bundle</TableHead>
                  <TableHead>Item price</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineDetails.map((row) => (
                  <TableRow key={row.itemId}>
                    <TableCell>
                      <ProductImageCell src={row.item.imageUrl} name={row.item.name} />
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{row.item.name}</TableCell>
                    <TableCell>{catalogName(catalog, row.item.categoryId)}</TableCell>
                    <TableCell>{catalogName(catalog, row.item.subcategoryId)}</TableCell>
                    <TableCell>{row.item.scale || '—'}</TableCell>
                    <TableCell className="w-24">
                      <WholeNumberInput
                        min={1}
                        value={row.quantity}
                        onChange={(event) => patchQty(row.itemId, event.target.value)}
                      />
                    </TableCell>
                    <TableCell>{money(row.price)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => removeLine(row.itemId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Price"
        description="Auto total is the sum of each item selling price times its quantity. You can override the bundle price."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Auto-calculated total</Label>
            <Input value={autoTotal ? money(autoTotal) : '—'} disabled className="bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bundle-price">Bundle price</Label>
            <WholeNumberInput
              id="bundle-price"
              min={1}
              value={bundlePrice}
              onChange={(event) => {
                priceTouched.current = true
                setBundlePrice(event.target.value)
              }}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Final bundle price</Label>
            <Input value={bundlePrice ? money(bundlePrice) : '—'} disabled className="bg-slate-50" />
            <p className="text-[11px] text-slate-400">
              Offer and tax stay off this total until they are confirmed.
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Stock"
        description={
          lineDetails.length
            ? `Maximum bundles available based on current stock: ${Number.isFinite(maxBundles) ? maxBundles : 0}. You can create up to ${Number.isFinite(maxBundles) ? maxBundles : 0} bundles.`
            : 'Add items to calculate how many complete bundles current stock can make.'
        }
      >
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="bundle-stock">Bundle stock quantity</Label>
          <WholeNumberInput
            id="bundle-stock"
            min={1}
            value={bundleStock}
            onChange={(event) => {
              stockTouched.current = true
              setError('')
              setBundleStock(event.target.value)
            }}
            aria-invalid={Boolean(stockFieldError)}
            className={fieldErrorClass(stockFieldError)}
            required
          />
          <FieldError message={stockFieldError} />
          <p className="text-[11px] text-slate-400">
            Saving deducts this quantity from each component item. The bundle keeps its own stock.
          </p>
        </div>
        {stockImpactRows.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-slate-600">
            {stockImpactRows.map((row) => (
              <li
                key={row.itemId}
                className={cn(
                  row.insufficient && 'rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700',
                )}
              >
                {row.name}: deduct {row.deduct}, remaining {row.remaining}
              </li>
            ))}
          </ul>
        ) : null}
      </SurfaceCard>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={mutating || Boolean(stockFieldError)}>
          {mutating ? 'Saving…' : 'Save bundle'}
        </Button>
      </div>
    </form>
  )
}

export default AddBundlePage
