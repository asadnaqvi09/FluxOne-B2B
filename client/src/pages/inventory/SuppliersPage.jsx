import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SupplierFilters } from '@/components/feature/suppliers/SupplierFilters'
import { SupplierFormDialog } from '@/components/feature/suppliers/SupplierFormDialog'
import { SupplierTable } from '@/components/feature/suppliers/SupplierTable'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useSuppliers } from '@/hooks/useSuppliers'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

export function SuppliersPage() {
  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    updateFilters,
    setPage,
    createSupplier,
    updateSupplier,
    setSupplierActive,
  } = useSuppliers()

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editing, setEditing] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row) {
    setFormMode('edit')
    setEditing(row)
    setFormOpen(true)
  }

  async function handleSubmit(fields) {
    const result =
      formMode === 'edit' && editing?.id
        ? await updateSupplier(editing.id, fields)
        : await createSupplier(fields)
    if (result.success) {
      toastSuccess(formMode === 'edit' ? 'Supplier updated' : 'Supplier created')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  async function applySupplierStatus(row, isActive) {
    if (!row?.id) return
    setStatusUpdatingId(row.id)
    try {
      const result = await setSupplierActive(row.id, isActive)
      if (!result.success) toastError(result.error || 'Status update failed')
      else toastSuccess(isActive ? 'Supplier activated' : 'Supplier deactivated')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function handleStatusChange(row, isActive) {
    if (!row?.id || row.isActive === isActive) return
    if (!isActive) {
      setStatusTarget(row)
      return
    }
    void applySupplierStatus(row, true)
  }

  async function handleConfirmDeactivate() {
    if (!statusTarget?.id) return
    await applySupplierStatus(statusTarget, false)
    setStatusTarget(null)
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Supplier Management"
          description="Vendor directory — deactivate instead of delete so purchase history stays intact"
          actions={
            <Button
              type="button"
              className="cursor-pointer text-white"
              style={{ background: BRAND.purple }}
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Add supplier
            </Button>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <SupplierFilters
          q={filters.q}
          active={filters.active}
          onSearchChange={(q) => updateFilters({ q })}
          onActiveChange={(active) => updateFilters({ active, page: 1 })}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <SupplierTable
          items={items}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(limit) => updateFilters({ limit })}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
          statusUpdatingId={statusUpdatingId}
        />
      </MotionReveal>

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialSupplier={editing}
        loading={mutating}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        title="Deactivate supplier?"
        description={
          statusTarget
            ? `${statusTarget.companyName || 'This supplier'} will be hidden from new orders. Purchase history is kept.`
            : undefined
        }
        confirmLabel="Deactivate"
        loading={mutating}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  )
}

export default SuppliersPage
