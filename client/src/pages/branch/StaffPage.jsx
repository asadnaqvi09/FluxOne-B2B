import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StaffFilters } from '@/components/feature/branch/staff/StaffFilters'
import { StaffFormDialog } from '@/components/feature/branch/staff/StaffFormDialog'
import { StaffTable } from '@/components/feature/branch/staff/StaffTable'
import { DesignationFormDialog } from '@/components/feature/branch/designations/DesignationFormDialog'
import { StaffAttendanceTab } from '@/components/feature/branch/staff/StaffAttendanceTab'
import { StaffHolidaysTab } from '@/components/feature/branch/staff/StaffHolidaysTab'
import { StaffLeavesTab } from '@/components/feature/branch/staff/StaffLeavesTab'
import { StaffPerformanceTab } from '@/components/feature/branch/staff/StaffPerformanceTab'
import { Button } from '@/components/ui/button'
import { useBranchStaff } from '@/hooks/useBranchStaff'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { cn } from '@/lib/utils'

function useDebouncedSearch(updateFilters) {
  const [localQ, setLocalQ] = useState('')
  const timerRef = useRef(null)

  function onSearchChange(q) {
    setLocalQ(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => updateFilters({ q }), 300)
  }

  return { localQ, onSearchChange }
}

export function StaffPage() {
  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    updateFilters,
    setPage,
    createStaff,
    updateStaff,
    setStaffStatus,
    deleteStaff,
  } = useBranchStaff()

  const { localQ, onSearchChange } = useDebouncedSearch(updateFilters)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [designations, setDesignations] = useState([])
  const [designationFormOpen, setDesignationFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('list')

  const loadDesignations = async () => {
    const res = await apiClient.get(endpoints.branch.designations.list, { active: 'active', limit: 100 })
    if (res.success && res.data) {
      setDesignations(res.data.items || res.data || [])
    }
  }

  useEffect(() => {
    void loadDesignations()
  }, [])

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
        ? await updateStaff(editing.id, fields)
        : await createStaff(fields)
    if (result.success) {
      toastSuccess(formMode === 'edit' ? 'Staff updated' : 'Staff created')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  async function applyStaffStatus(row, status) {
    if (!row?.id) return
    setStatusUpdatingId(row.id)
    try {
      const result = await setStaffStatus(row.id, status)
      if (!result.success) toastError(result.error || 'Status update failed')
      else toastSuccess(status === 'inactive' ? 'Staff deactivated' : 'Staff activated')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function handleStatusChange(row, nextActive) {
    if (!row?.id) return
    const currentlyActive = row.status === 'active' || row.status === 'open'
    if (currentlyActive === nextActive) return
    if (!nextActive) {
      setStatusTarget(row)
      return
    }
    void applyStaffStatus(row, 'active')
  }

  async function handleConfirmDeactivate() {
    if (!statusTarget?.id) return
    await applyStaffStatus(statusTarget, 'inactive')
    setStatusTarget(null)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget?.id) return
    const result = await deleteStaff(deleteTarget.id)
    setDeleteTarget(null)
    if (result.success) toastSuccess('Staff deleted')
    else toastError(result.error || 'Delete failed')
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Branch Team"
          title="Staff Management"
          description="Manage Inventory Managers and Cashiers for your branch only."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => setDesignationFormOpen(true)}
                style={{ color: BRAND.purple, borderColor: BRAND.purple }}
                className="w-full bg-white hover:bg-purple-50/40 sm:w-auto"
              >
                + Create Designation
              </Button> */}
              <Button
                type="button"
                onClick={openCreate}
                style={{ background: BRAND.purple }}
                className="w-full text-white hover:opacity-90 sm:w-auto"
              >
                <Plus className="size-4" />
                Add Staff
              </Button>
            </div>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      {/* Capsule tabs navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { id: 'list', label: 'Staff Roster' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'holidays', label: 'Holidays' },
          { id: 'leaves', label: 'Leaves' },
          { id: 'performance', label: 'Performance' },
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm',
                active
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-border bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              )}
              style={active ? { background: BRAND.purple } : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'list' && (
        <>
          <MotionReveal delay={0.04}>
            <StaffFilters
              q={localQ}
              status={filters.status || ''}
              designationId={filters.designationId || ''}
              designations={designations}
              onChange={(patch) => {
                if (patch.q !== undefined) onSearchChange(patch.q)
                if (patch.status !== undefined) updateFilters({ status: patch.status })
                if (patch.designationId !== undefined) updateFilters({ designationId: patch.designationId })
              }}
            />
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <StaffTable
              items={items}
              loading={loading}
              pagination={pagination}
              onPageChange={setPage}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onStatusChange={handleStatusChange}
              statusUpdatingId={statusUpdatingId}
            />
          </MotionReveal>
        </>
      )}

      {activeTab === 'attendance' && (
        <MotionReveal delay={0.04}>
          <StaffAttendanceTab designations={designations} staff={items} />
        </MotionReveal>
      )}

      {activeTab === 'holidays' && (
        <MotionReveal delay={0.04}>
          <StaffHolidaysTab designations={designations} staff={items} />
        </MotionReveal>
      )}

      {activeTab === 'leaves' && (
        <MotionReveal delay={0.04}>
          <StaffLeavesTab designations={designations} staff={items} />
        </MotionReveal>
      )}

      {activeTab === 'performance' && (
        <MotionReveal delay={0.04}>
          <StaffPerformanceTab designations={designations} />
        </MotionReveal>
      )}

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialStaff={editing}
        loading={mutating}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        title="Deactivate staff?"
        description={
          statusTarget
            ? `${statusTarget.fullName || statusTarget.email} will be blocked from logging in. You can reactivate them later.`
            : undefined
        }
        confirmLabel="Deactivate"
        loading={mutating}
        onConfirm={handleConfirmDeactivate}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete staff?"
        description={
          deleteTarget
            ? `Permanently remove ${deleteTarget.fullName || deleteTarget.email}? Prefer Inactive if you only want to block login.`
            : undefined
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleConfirmDelete}
      />

      <DesignationFormDialog
        open={designationFormOpen}
        onOpenChange={setDesignationFormOpen}
        onSubmitSuccess={(newDesignation) => {
          toastSuccess('Designation created')
          void loadDesignations()
        }}
      />
    </div>
  )
}

export default StaffPage
