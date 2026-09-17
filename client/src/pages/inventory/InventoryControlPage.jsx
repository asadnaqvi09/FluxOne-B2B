import { useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { AddStockInDialog } from '@/components/feature/control/AddStockInDialog'
import { AdjustmentDialog } from '@/components/feature/control/AdjustmentDialog'
import { AdjustmentTable } from '@/components/feature/control/AdjustmentTable'
import { DamagedDialog } from '@/components/feature/control/DamagedDialog'
import { DamagedTable } from '@/components/feature/control/DamagedTable'
import { ExpiredTable } from '@/components/feature/control/ExpiredTable'
import { InventoryControlTabs } from '@/components/feature/control/InventoryControlTabs'
import { MovementFilters } from '@/components/feature/control/MovementFilters'
import { OrderDemandDialog } from '@/components/feature/control/OrderDemandDialog'
import { StockInTable } from '@/components/feature/control/StockInTable'
import { StockOutTable } from '@/components/feature/control/StockOutTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useInventoryControl } from '@/hooks/useInventoryControl'
import { BRAND } from '@/lib/constants'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { toastError, toastSuccess } from '@/lib/toast'

// Tabs that expose an "Add …" CTA (Stock Out / Expired are history-only).
const TABS_WITH_ADD = new Set([
  MOVEMENT_TYPES.IN,
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.DAMAGED,
])

const TABS_WITH_EDIT = new Set([MOVEMENT_TYPES.ADJUSTMENT, MOVEMENT_TYPES.DAMAGED])

function ControlTabPanel({ tab }) {
  const {
    items: rawItems,
    pagination,
    filters,
    loading,
    mutating,
    error,
    catalog,
    selectedCategorySubs,
    updateFilters,
    setPage,
    createMovement,
    updateMovement,
    deleteMovement,
    stockInFromOrder,
  } = useInventoryControl(tab)

  // Fetch adjustments when on Stock In or Stock Out tabs
  const {
    items: adjustmentItems,
    loading: adjustmentLoading,
  } = (tab === MOVEMENT_TYPES.IN || tab === MOVEMENT_TYPES.OUT) ? useInventoryControl(MOVEMENT_TYPES.ADJUSTMENT) : { items: [], loading: false }

  // Combine items based on current tab
  const items = 
    tab === MOVEMENT_TYPES.IN
      ? [
          ...rawItems,
          ...(adjustmentItems?.filter(adj => {
            const qty = Number(adj.quantity || 0)
            return qty > 0  // Positive adjustments go to Stock In
          }) || []),
        ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      : tab === MOVEMENT_TYPES.OUT
        ? [
            ...rawItems,
            ...(adjustmentItems?.filter(adj => {
              const qty = Number(adj.quantity || 0)
              return qty < 0  // Negative adjustments go to Stock Out
            }) || []),
          ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        : rawItems

  const combinedLoading = (tab === MOVEMENT_TYPES.IN || tab === MOVEMENT_TYPES.OUT) ? loading || adjustmentLoading : loading

  const { localQ, setLocalQ, onSearchChange } = useDebouncedSearch(
    updateFilters,
    filters.q || '',
  )

  const [addOpen, setAddOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const canAdd = TABS_WITH_ADD.has(tab)
  const canEdit = TABS_WITH_EDIT.has(tab)
  const slowHint = useSlowLoadingHint(combinedLoading)

  function handleFilterChange(patch) {
    if (patch.q !== undefined) setLocalQ(patch.q)
    updateFilters(patch)
  }

  async function handleCreate(payload) {
    const result = await createMovement(payload)
    if (result.success) toastSuccess('Saved')
    else toastError(result.error || 'Save failed')
    return result
  }

  async function handleUpdate(payload) {
    if (!editTarget?.id) return { success: false, error: 'Nothing to edit' }
    const result = await updateMovement(editTarget.id, payload)
    if (result.success) {
      setEditTarget(null)
      toastSuccess('Updated')
    } else {
      toastError(result.error || 'Update failed')
    }
    return result
  }

  async function handleConfirmDelete() {
    if (!deleteTarget?.id) return
    const result = await deleteMovement(deleteTarget.id)
    if (result.success) {
      setDeleteTarget(null)
      toastSuccess('Deleted')
    } else {
      toastError(result.error || 'Delete failed')
    }
  }

  async function handleReceiveOrder(purchaseOrderId) {
    const result = await stockInFromOrder(purchaseOrderId)
    if (result.success) toastSuccess('Purchase order received into stock')
    else toastError(result.error || 'Receive failed')
    return result
  }

  const addLabel =
    tab === MOVEMENT_TYPES.IN
      ? 'Add stock'
      : tab === MOVEMENT_TYPES.ADJUSTMENT
        ? 'Add adjustment'
        : 'Add damaged'

  const titleActions =
    tab === MOVEMENT_TYPES.IN || canAdd ? (
      <>
        {tab === MOVEMENT_TYPES.IN ? (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            style={{ color: BRAND.deep }}
            onClick={() => setOrderOpen(true)}
          >
            <ClipboardList className="size-4" />
            By order demand
          </Button>
        ) : null}
        {canAdd ? (
          <Button
            type="button"
            className="cursor-pointer text-white"
            style={{ background: BRAND.purple }}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            {addLabel}
          </Button>
        ) : null}
      </>
    ) : null

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <SlowLoadingBanner show={slowHint} />

      {titleActions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{titleActions}</div>
      ) : null}

      {tab === MOVEMENT_TYPES.EXPIRED ? (
        <p className="rounded-xl border border-dashed border-border bg-slate-50/80 px-3 py-2 text-sm text-slate-600">
          Expired stock is processed automatically from stock-in lots past their expiry date. Set an
          expiry when adding stock.
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <MovementFilters
          q={localQ}
          type={filters.type || ''}
          scale={filters.scale || ''}
          categoryId={filters.categoryId || ''}
          subcategoryId={filters.subcategoryId || ''}
          categories={catalog.parents}
          subcategories={selectedCategorySubs}
          onSearchChange={onSearchChange}
          onChange={handleFilterChange}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        {tab === MOVEMENT_TYPES.IN ? (
          <StockInTable
            items={items}
            loading={combinedLoading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.OUT ? (
          <StockOutTable
            items={items}
            loading={combinedLoading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.ADJUSTMENT ? (
          <AdjustmentTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.DAMAGED ? (
          <DamagedTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.EXPIRED ? (
          <ExpiredTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
          />
        ) : null}
      </MotionReveal>

      {tab === MOVEMENT_TYPES.IN ? (
        <>
          <AddStockInDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            catalog={catalog}
            loading={mutating}
            onSubmit={handleCreate}
          />
          <OrderDemandDialog
            open={orderOpen}
            onOpenChange={setOrderOpen}
            loading={mutating}
            onReceive={handleReceiveOrder}
          />
        </>
      ) : null}

      {tab === MOVEMENT_TYPES.ADJUSTMENT ? (
        <>
          <AdjustmentDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            mode="create"
            catalog={catalog}
            loading={mutating}
            onSubmit={handleCreate}
          />
          <AdjustmentDialog
            open={Boolean(editTarget)}
            onOpenChange={(open) => {
              if (!open) setEditTarget(null)
            }}
            mode="edit"
            initial={editTarget}
            catalog={catalog}
            loading={mutating}
            onSubmit={handleUpdate}
          />
        </>
      ) : null}

      {tab === MOVEMENT_TYPES.DAMAGED ? (
        <>
          <DamagedDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            mode="create"
            catalog={catalog}
            loading={mutating}
            onSubmit={handleCreate}
          />
          <DamagedDialog
            open={Boolean(editTarget)}
            onOpenChange={(open) => {
              if (!open) setEditTarget(null)
            }}
            mode="edit"
            initial={editTarget}
            catalog={catalog}
            loading={mutating}
            onSubmit={handleUpdate}
          />
        </>
      ) : null}

      {canEdit ? (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title="Delete this record?"
          description={
            deleteTarget
              ? `Remove this ${tab} entry for ${deleteTarget.productName || 'item'}? On-hand stock will be reversed.`
              : undefined
          }
          confirmLabel="Delete"
          loading={mutating}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </div>
  )
}

export function InventoryControlPage() {
  const [tab, setTab] = useState(MOVEMENT_TYPES.IN)

  return (
    <div className="space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Inventory"
          title="Control"
          description="Live stock movements — stock in, out, adjustments, damaged, and expired."
        />
      </MotionHeader>

      <MotionReveal delay={0.02}>
        <InventoryControlTabs value={tab} onChange={setTab} />
      </MotionReveal>

      <ControlTabPanel key={tab} tab={tab} />
    </div>
  )
}

export default InventoryControlPage