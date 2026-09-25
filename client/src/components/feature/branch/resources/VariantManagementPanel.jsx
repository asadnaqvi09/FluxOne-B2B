import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { VariantTypeDialog } from '@/components/feature/branch/resources/VariantTypeDialog'
import { VariantValueDialog } from '@/components/feature/branch/resources/VariantValueDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { ParentChildTreePanel } from '@/components/shared/ParentChildTreePanel'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { filterParentChildRows } from '@/lib/filterParentChildRows'
import { TABLE_PAGE_SIZE } from '@/lib/tablePagination'
import { toastError, toastSuccess } from '@/lib/toast'

export function VariantManagementPanel() {
  const [saving, setSaving] = useState(false)
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  // Multi-open — same expand model as Categories
  const [openIds, setOpenIds] = useState(() => new Set())
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)

  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [typeDialogMode, setTypeDialogMode] = useState('create')
  const [editingType, setEditingType] = useState(null)

  const [valueDialogOpen, setValueDialogOpen] = useState(false)
  const [valueDialogMode, setValueDialogMode] = useState('create')
  const [editingValue, setEditingValue] = useState(null)
  const [lockedTypeId, setLockedTypeId] = useState(null)

  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteKind, setDeleteKind] = useState(null)

  const loadTypes = useCallback(async () => {
    const res = await apiClient.get(endpoints.branch.resources.variantTypes.list, {
      active: 'all',
      includeValues: true,
    })
    if (res.success) {
      setTypes(res.data || [])
      return true
    }
    toastError(res.error || 'Failed to load variant types')
    return false
  }, [])

  // Mount fetch — setState only runs after the network response
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await apiClient.get(endpoints.branch.resources.variantTypes.list, {
        active: 'all',
        includeValues: true,
      })
      if (cancelled) return
      if (res.success) setTypes(res.data || [])
      else toastError(res.error || 'Failed to load variant types')
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Normalize types → shared tree row shape
  const treeRows = useMemo(() => {
    return types.map((type) => {
      const values = type.values || []
      return {
        id: type.id,
        name: type.name,
        isActive: type.isActive,
        valuesCount: type.valuesCount,
        children: values.map((value) => ({
          id: value.id,
          name: value.name,
          isActive: value.isActive,
          variantTypeId: value.variantTypeId || type.id,
        })),
        _raw: type,
      }
    })
  }, [types])

  const rows = useMemo(
    () => filterParentChildRows(treeRows, statusFilter, debouncedSearch),
    [treeRows, statusFilter, debouncedSearch],
  )

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(rows, TABLE_PAGE_SIZE)

  function toggleParent(parentId) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      return next
    })
  }

  function openCreateType() {
    setTypeDialogMode('create')
    setEditingType(null)
    setTypeDialogOpen(true)
  }

  function openEditType(type) {
    setTypeDialogMode('edit')
    setEditingType(type._raw || type)
    setTypeDialogOpen(true)
  }

  function openCreateValue(type = null) {
    setValueDialogMode('create')
    setEditingValue(null)
    setLockedTypeId(type?.id || null)
    setValueDialogOpen(true)
  }

  function openEditValue(value) {
    setValueDialogMode('edit')
    setEditingValue(value)
    setLockedTypeId(null)
    setValueDialogOpen(true)
  }

  async function handleTypeSubmit({ name, isActive }) {
    setSaving(true)
    try {
      const res =
        typeDialogMode === 'edit' && editingType?.id
          ? await apiClient.put(endpoints.branch.resources.variantTypes.update(editingType.id), {
              name,
              isActive,
            })
          : await apiClient.post(endpoints.branch.resources.variantTypes.create, {
              name,
              isActive,
            })

      if (!res.success) return res
      toastSuccess(typeDialogMode === 'edit' ? 'Variant type updated' : 'Variant type created')
      await loadTypes()
      return res
    } finally {
      setSaving(false)
    }
  }

  async function handleValueSubmit({ variantTypeId, name, isActive }) {
    setSaving(true)
    try {
      const res =
        valueDialogMode === 'edit' && editingValue?.id
          ? await apiClient.put(
              endpoints.branch.resources.variantValues.update(editingValue.id),
              { variantTypeId, name, isActive },
            )
          : await apiClient.post(endpoints.branch.resources.variantValues.create, {
              variantTypeId,
              name,
              isActive,
            })

      if (!res.success) return res
      toastSuccess(valueDialogMode === 'edit' ? 'Variant value updated' : 'Variant value created')
      // Open the parent so the new value is visible
      if (variantTypeId) {
        setOpenIds((prev) => new Set(prev).add(variantTypeId))
      }
      await loadTypes()
      return res
    } finally {
      setSaving(false)
    }
  }

  async function patchStatus(kind, row, isActive) {
    const target = row._raw || row
    if (!target?.id) return
    if (!isActive) {
      setDeactivateTarget({ kind, row: target })
      return
    }

    setStatusUpdatingId(target.id)
    try {
      const endpoint =
        kind === 'type'
          ? endpoints.branch.resources.variantTypes.update(target.id)
          : endpoints.branch.resources.variantValues.update(target.id)
      const res = await apiClient.put(endpoint, { isActive: true })
      if (res.success) {
        toastSuccess(kind === 'type' ? 'Variant type activated' : 'Variant value activated')
        await loadTypes()
      } else {
        toastError(res.error || 'Activate failed')
      }
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget?.row?.id) return
    const { kind, row } = deactivateTarget
    setStatusUpdatingId(row.id)
    try {
      const endpoint =
        kind === 'type'
          ? endpoints.branch.resources.variantTypes.update(row.id)
          : endpoints.branch.resources.variantValues.update(row.id)
      const res = await apiClient.put(endpoint, { isActive: false })
      setDeactivateTarget(null)
      if (res.success) {
        toastSuccess(kind === 'type' ? 'Variant type deactivated' : 'Variant value deactivated')
        await loadTypes()
      } else {
        toastError(res.error || 'Deactivate failed')
      }
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function requestDelete(kind, row) {
    setDeleteKind(kind)
    setDeleteTarget(row._raw || row)
  }

  async function confirmDelete() {
    if (!deleteTarget?.id || !deleteKind) return
    setSaving(true)
    try {
      const endpoint =
        deleteKind === 'type'
          ? endpoints.branch.resources.variantTypes.delete(deleteTarget.id)
          : endpoints.branch.resources.variantValues.delete(deleteTarget.id)
      const res = await apiClient.delete(endpoint)
      if (!res.success) {
        toastError(res.error || 'Delete failed')
        return
      }
      if (deleteKind === 'type') {
        const count = res.data?.deletedValuesCount || 0
        toastSuccess(
          count > 0
            ? `Variant type deleted (${count} value${count === 1 ? '' : 's'} removed)`
            : 'Variant type deleted',
        )
        setOpenIds((prev) => {
          if (!prev.has(deleteTarget.id)) return prev
          const next = new Set(prev)
          next.delete(deleteTarget.id)
          return next
        })
      } else {
        toastSuccess('Variant value deleted')
      }
      setDeleteTarget(null)
      setDeleteKind(null)
      await loadTypes()
    } finally {
      setSaving(false)
    }
  }

  const deleteDescription =
    deleteKind === 'type'
      ? (deleteTarget?.valuesCount || deleteTarget?.values?.length || 0) > 0
        ? `This type has ${deleteTarget.valuesCount || deleteTarget.values.length} associated value(s). Deleting it will also remove all associated values.`
        : `Permanently remove variant type “${deleteTarget?.name}”? This cannot be undone.`
      : `Permanently remove variant value “${deleteTarget?.name}”? This cannot be undone.`

  const hasActiveType = types.some((t) => t.isActive !== false)

  return (
    <>
      <ParentChildTreePanel
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchId="variant-search"
        searchPlaceholder="Search type or value…"
        status={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value)
          setPage(1)
        }}
        statusId="variant-status-filter"
        toolbarActions={
          <>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => openCreateValue()}
              disabled={!hasActiveType}
            >
              <Plus className="size-4" />
              Add Value
            </Button>
            <Button
              type="button"
              variant="brand"
              className="cursor-pointer"
              onClick={openCreateType}
            >
              <Plus className="size-4" />
              Add Variant Type
            </Button>
          </>
        }
        title="Variant Types"
        description="Click the chevron to expand or collapse values"
        countLabel={`${rows.length} type${rows.length === 1 ? '' : 's'}${
          statusFilter !== 'all' ? ` · ${statusFilter}` : ''
        }`}
        emptyIcon={Layers}
        emptyTitle={
          debouncedSearch || statusFilter !== 'all'
            ? 'No variant types match your filters.'
            : 'No variant types yet. Create a type first, then add values.'
        }
        loading={loading}
        rows={pageRows}
        openIds={openIds}
        onToggleParent={toggleParent}
        renderParentMeta={(parent, children) => (
          <p className="text-xs text-slate-400">
            {parent.valuesCount ?? children.length} value
            {(parent.valuesCount ?? children.length) === 1 ? '' : 's'}
          </p>
        )}
        renderParentActions={(parent) => {
          const inactive = parent.isActive === false
          return (
            <>
              <EntityStatusToggle
                status={inactive ? 'inactive' : 'active'}
                loading={statusUpdatingId === parent.id}
                onChange={(nextActive) => patchStatus('type', parent, nextActive)}
              />
              {!inactive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => openCreateValue(parent)}
                >
                  <Plus className="size-3.5" />
                  Add Values
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110"
                title="Edit"
                onClick={() => openEditType(parent)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110"
                title="Delete"
                aria-label={`Delete ${parent.name || 'variant type'}`}
                onClick={() => requestDelete('type', parent)}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )
        }}
        // Always allow expand so empty types can show the empty hint
        renderChildEmpty={() => (
          <div className="rounded-lg bg-white px-2.5 py-3 text-sm text-slate-400 ring-1 ring-border">
            No values yet. Use Add Values to create one.
          </div>
        )}
        renderChild={(child) => (
          <>
            <span className="truncate text-sm font-medium text-slate-800">{child.name}</span>
            <div className="flex items-center gap-1">
              <EntityStatusToggle
                status={child.isActive === false ? 'inactive' : 'active'}
                loading={statusUpdatingId === child.id}
                onChange={(nextActive) => patchStatus('value', child, nextActive)}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110"
                title="Edit"
                onClick={() => openEditValue(child)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110"
                title="Delete"
                aria-label={`Delete ${child.name || 'variant value'}`}
                onClick={() => requestDelete('value', child)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </>
        )}
        pagination={{
          page,
          pageCount,
          total,
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />

      <VariantTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        mode={typeDialogMode}
        initial={editingType}
        loading={saving}
        onSubmit={handleTypeSubmit}
      />

      <VariantValueDialog
        open={valueDialogOpen}
        onOpenChange={setValueDialogOpen}
        mode={valueDialogMode}
        initial={editingValue}
        types={types}
        lockedTypeId={lockedTypeId}
        loading={saving}
        onSubmit={handleValueSubmit}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
        title={
          deactivateTarget?.kind === 'type'
            ? 'Deactivate variant type?'
            : 'Deactivate variant value?'
        }
        description={
          deactivateTarget?.kind === 'type'
            ? `“${deactivateTarget?.row?.name}” will be inactive. Existing values stay, but new values cannot be added to it until reactivated.`
            : `“${deactivateTarget?.row?.name}” will be inactive and hidden from active selection lists.`
        }
        confirmLabel="Deactivate"
        loading={Boolean(statusUpdatingId)}
        onConfirm={confirmDeactivate}
      />

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteKind(null)
          }
        }}
        entityName={deleteTarget?.name}
        title={
          deleteKind === 'type'
            ? `Remove “${deleteTarget?.name}” variant type?`
            : `Remove “${deleteTarget?.name}” variant value?`
        }
        description={deleteDescription}
        showSoftAction={false}
        canHardDelete
        hardLabel="Permanently delete"
        loading={saving}
        onHardDelete={confirmDelete}
      />
    </>
  )
}

export default VariantManagementPanel
