import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Camera, Plus } from 'lucide-react'
import { ImportItemsDialog } from '@/components/feature/products/ImportItemsDialog'
import { ItemFormDialog } from '@/components/feature/products/ItemFormDialog'
import { PrintBarcodeDialog } from '@/components/feature/products/PrintBarcodeDialog'
import { ProductFilters } from '@/components/feature/products/ProductFilters'
import { ProductTable } from '@/components/feature/products/ProductTable'
import { ScanItemDialog } from '@/components/feature/products/ScanItemDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useProducts } from '@/hooks/useProducts'
import { BRAND } from '@/lib/constants'
import { PRODUCT_STATUS, PRODUCT_TYPES } from '@/lib/mapProduct'
import { toastError, toastSuccess } from '@/lib/toast'

export function ProductsPage() {
  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    catalog,
    selectedCategorySubs,
    updateFilters,
    setPage,
    createProduct,
    updateProduct,
    setProductStatus,
    deleteProduct,
    fetchProductDeleteInfo,
    importProducts,
    scanBarcode,
    fetchProductDetail,
    fetchBarcodePng,
    exportCsv,
    loadBundleOptions,
    bundleOptions,
    bundleOptionsLoading,
  } = useProducts()

  const { localQ, onSearchChange } = useDebouncedSearch(updateFilters)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formType, setFormType] = useState(PRODUCT_TYPES.SINGLE)
  const [editing, setEditing] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [printTarget, setPrintTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteInfo, setDeleteInfo] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const activeParents = (catalog.parents || []).filter((row) => row.isActive !== false)
  const activeSubs = (selectedCategorySubs || []).filter((row) => row.isActive !== false)

  async function openCreate(type) {
    setFormMode('create')
    setFormType(type)
    setEditing(null)
    if (type === PRODUCT_TYPES.BUNDLE) await loadBundleOptions()
    setFormOpen(true)
  }

  async function openEdit(row) {
    setFormMode('edit')
    setFormType(row.type || PRODUCT_TYPES.SINGLE)
    setEditing(row)
    if (row.type === PRODUCT_TYPES.BUNDLE) {
      await loadBundleOptions()
    }
    setFormOpen(true)
    const detail = await fetchProductDetail(row.id)
    if (detail.success && detail.data) {
      setEditing(detail.data)
    }
  }

  async function handleSubmit(fields) {
    const result =
      formMode === 'edit' && editing?.id
        ? await updateProduct(editing.id, fields)
        : await createProduct(fields)
    if (result.success) {
      // Create success UI lives in ItemFormDialog (itemCode / barcode / print)
      if (formMode === 'edit') toastSuccess('Product updated')
      else toastSuccess('Product created')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  function handlePrintFromCreate(product) {
    if (!product?.id) return
    setPrintTarget(product)
  }

  async function applyProductStatus(row, status) {
    if (!row?.id) return
    setStatusUpdatingId(row.id)
    try {
      const result = await setProductStatus(row.id, status)
      if (!result.success) toastError(result.error || 'Status update failed')
      else toastSuccess(status === PRODUCT_STATUS.INACTIVE ? 'Product deactivated' : 'Product activated')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function handleStatusChange(row, status) {
    if (!row?.id || row.status === status) return
    if (status === PRODUCT_STATUS.INACTIVE) {
      setStatusTarget(row)
      return
    }
    void applyProductStatus(row, status)
  }

  async function handleConfirmDeactivate() {
    if (!statusTarget?.id) return
    await applyProductStatus(statusTarget, PRODUCT_STATUS.INACTIVE)
    setStatusTarget(null)
  }

  async function openDelete(row) {
    if (!row?.id) return
    setDeleteTarget(row)
    setDeleteInfo(null)
    setDeleteLoading(true)
    try {
      const result = await fetchProductDeleteInfo(row.id)
      if (result.success) setDeleteInfo(result.data)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleDeactivateFromDelete() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await deleteProduct({ id: deleteTarget.id, permanent: false })
      if (result.success) {
        toastSuccess('Product deactivated')
        setDeleteTarget(null)
        setDeleteInfo(null)
      } else {
        toastError(result.error || 'Deactivate failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handlePermanentDelete() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await deleteProduct({ id: deleteTarget.id, permanent: true })
      if (result.success) {
        toastSuccess('Product permanently deleted')
        setDeleteTarget(null)
        setDeleteInfo(null)
      } else {
        toastError(result.error || 'Permanent delete failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  const deleteIsActive =
    deleteTarget?.status !== PRODUCT_STATUS.INACTIVE && deleteTarget?.status !== 'close'
  const canPermanentDelete = Boolean(deleteInfo?.canPermanentDelete)

  async function handleExport() {
    const result = await exportCsv()
    if (result.success) toastSuccess(`Exported ${result.data.exported} products (CSV)`)
    else toastError(result.error || 'Export failed')
  }

  async function handleImport(rows) {
    const result = await importProducts(rows)
    if (result.success) {
      const imported = result.data?.imported ?? rows.length
      const failed = result.data?.failed || 0
      toastSuccess(
        failed
          ? `Imported ${imported}; ${failed} row(s) skipped`
          : `Imported ${imported} products`,
      )
    } else {
      toastError(result.error || 'Import failed')
    }
    return result
  }

  async function handleScanOpenProduct(found) {
    if (!found?.id) return
    await openEdit({ id: found.id, type: PRODUCT_TYPES.SINGLE })
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Product Management"
          description="Browse like POS — search, pick a category, then subcategory (if any), then manage items"
          actions={
            <>
              <Button
                type="button"
                className="cursor-pointer text-white"
                style={{ background: BRAND.purple }}
                onClick={() => openCreate(PRODUCT_TYPES.SINGLE)}
              >
                <Plus className="size-4" />
                Single Item
              </Button>
              <Button
                type="button"
                className="cursor-pointer text-white"
                style={{ background: BRAND.purple }}
                onClick={() => openCreate(PRODUCT_TYPES.BUNDLE)}
              >
                <Plus className="size-4" />
                Bundle
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                style={{ color: BRAND.deep }}
                onClick={() => setImportOpen(true)}
              >
                <ArrowUpFromLine className="size-4" />
                Import
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                style={{ color: BRAND.deep }}
                disabled={mutating}
                onClick={handleExport}
              >
                <ArrowDownToLine className="size-4" />
                Export
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                style={{ color: BRAND.deep }}
                onClick={() => setScanOpen(true)}
              >
                <Camera className="size-4" />
                Scan
              </Button>
            </>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <ProductFilters
          q={localQ}
          type={filters.type || ''}
          status={filters.status || 'active'}
          categoryId={filters.categoryId || ''}
          subcategoryId={filters.subcategoryId || ''}
          categories={activeParents}
          subcategories={activeSubs}
          onSearchChange={onSearchChange}
          onChange={updateFilters}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <ProductTable
          items={items}
          loading={loading}
          pagination={pagination}
          statusUpdatingId={statusUpdatingId}
          onPageChange={setPage}
          onEdit={openEdit}
          onPrintBarcode={setPrintTarget}
          onStatusChange={handleStatusChange}
          onDelete={openDelete}
        />
      </MotionReveal>

      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        productType={formType}
        initialProduct={editing}
        categories={activeParents}
        childrenByParent={catalog.childrenByParent}
        taxes={catalog.taxes}
        offers={catalog.offers}
        catalogItems={bundleOptions}
        catalogItemsLoading={bundleOptionsLoading}
        loading={mutating}
        onSubmit={handleSubmit}
        onPrintBarcode={handlePrintFromCreate}
      />

      <ImportItemsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        loading={mutating}
        onSubmit={handleImport}
      />

      <ScanItemDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        loading={mutating}
        onScan={scanBarcode}
        onOpenProduct={handleScanOpenProduct}
      />

      <PrintBarcodeDialog
        open={Boolean(printTarget)}
        onOpenChange={(open) => {
          if (!open) setPrintTarget(null)
        }}
        product={printTarget}
        fetchBarcodePng={fetchBarcodePng}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        title="Deactivate product?"
        description={
          statusTarget
            ? `${statusTarget.name || 'This product'} will be hidden from active lists and POS sync. You can reactivate it later.`
            : undefined
        }
        confirmLabel="Deactivate"
        loading={mutating}
        onConfirm={handleConfirmDeactivate}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteInfo(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? deleteIsActive
                  ? `${deleteTarget.name || 'This product'} can be deactivated (keeps history) or permanently removed when eligible.`
                  : `${deleteTarget.name || 'This product'} is inactive. ${
                      canPermanentDelete
                        ? 'You can permanently remove it from the catalog.'
                        : 'It cannot be permanently deleted because it has linked records or stock.'
                    }`
                : null}
            </DialogDescription>
          </DialogHeader>
          {deleteInfo?.reason && !canPermanentDelete && Number(deleteTarget?.quantity ?? 0) === 0 ? (
            <p className="text-xs text-slate-500">{deleteInfo.reason}</p>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={deleteLoading || mutating}
              className="w-full sm:w-auto"
              onClick={() => {
                setDeleteTarget(null)
                setDeleteInfo(null)
              }}
            >
              Cancel
            </Button>
            {deleteIsActive ? (
              <Button
                type="button"
                variant="outline"
                disabled={deleteLoading || mutating}
                className="w-full sm:w-auto"
                onClick={handleDeactivateFromDelete}
              >
                {deleteLoading ? 'Please wait…' : 'Deactivate'}
              </Button>
            ) : null}
            {canPermanentDelete ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deleteLoading || mutating}
                className="w-full sm:w-auto"
                onClick={handlePermanentDelete}
              >
                {deleteLoading ? 'Please wait…' : 'Permanently delete'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductsPage
