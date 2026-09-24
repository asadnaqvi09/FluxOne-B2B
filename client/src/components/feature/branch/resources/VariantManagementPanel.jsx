import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { VariantTypeDialog } from '@/components/feature/branch/resources/VariantTypeDialog'
import { VariantValueDialog } from '@/components/feature/branch/resources/VariantValueDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

function filterTypes(types, statusFilter, search) {
  const q = String(search || '')
    .trim()
    .toLowerCase()

  return (types || [])
    .filter((type) => {
      if (statusFilter === 'active' && type.isActive === false) return false
      if (statusFilter === 'inactive' && type.isActive !== false) return false
      if (!q) return true
      if (type.name?.toLowerCase().includes(q)) return true
      return (type.values || []).some((value) => value.name?.toLowerCase().includes(q))
    })
    .map((type) => {
      if (!q) return type
      const nameHit = type.name?.toLowerCase().includes(q)
      if (nameHit) return type
      return {
        ...type,
        values: (type.values || []).filter((value) =>
          value.name?.toLowerCase().includes(q),
        ),
      }
    })
}

export function VariantManagementPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [types, setTypes] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [expandedId, setExpandedId] = useState(null)
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

  useEffect(() => {
    setLoading(true)
    void loadTypes().finally(() => setLoading(false))
  }, [loadTypes])

  const rows = useMemo(
    () => filterTypes(types, statusFilter, debouncedSearch),
    [types, statusFilter, debouncedSearch],
  )

  function toggleExpand(typeId) {
    setExpandedId((prev) => (prev === typeId ? null : typeId))
  }

  function openCreateType() {
    setTypeDialogMode('create')
    setEditingType(null)
    setTypeDialogOpen(true)
  }

  function openEditType(type) {
    setTypeDialogMode('edit')
    setEditingType(type)
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
      if (variantTypeId) setExpandedId(variantTypeId)
      await loadTypes()
      return res
    } finally {
      setSaving(false)
    }
  }

  async function patchStatus(kind, row, isActive) {
    if (!row?.id) return
    if (!isActive) {
      setDeactivateTarget({ kind, row })
      return
    }

    setStatusUpdatingId(row.id)
    try {
      const endpoint =
        kind === 'type'
          ? endpoints.branch.resources.variantTypes.update(row.id)
          : endpoints.branch.resources.variantValues.update(row.id)
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
    setDeleteTarget(row)
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
        if (expandedId === deleteTarget.id) setExpandedId(null)
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

  return (
    <>
      <MotionReveal delay={0.02}>
        <SurfaceCard padding="compact">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid w-full min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="variant-search">Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="variant-search"
                    value={search}
                    placeholder="Search type or value…"
                    className="pl-9"
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="variant-status-filter">Status</Label>
                <NativeSelect
                  id="variant-status-filter"
                  value={statusFilter}
                  className="cursor-pointer"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </NativeSelect>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer md:w-auto"
                onClick={() => openCreateValue()}
                disabled={!types.some((t) => t.isActive !== false)}
              >
                <Plus className="mr-1.5 size-4" />
                Add Value
              </Button>
              <Button
                type="button"
                variant="brand"
                className="w-full cursor-pointer md:w-auto"
                onClick={openCreateType}
              >
                <Plus className="mr-1.5 size-4" />
                Add Variant Type
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <SurfaceCard
          title="Variant Types"
          description="Click a type to expand or collapse its values"
          actions={
            <span className="text-xs text-slate-400">
              {rows.length} type{rows.length === 1 ? '' : 's'}
              {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
            </span>
          }
        >
          {loading ? (
            <TableRowsSkeleton rows={4} />
          ) : !rows.length ? (
            <EmptyState
              icon={Layers}
              title={
                debouncedSearch || statusFilter !== 'all'
                  ? 'No variant types match your filters.'
                  : 'No variant types yet. Create a type first, then add values.'
              }
              compact
            />
          ) : (
            <ul className="space-y-3">
              {rows.map((type) => {
                const values = type.values || []
                const expanded = expandedId === type.id
                const inactive = type.isActive === false

                return (
                  <li
                    key={type.id}
                    className={cn(
                      'rounded-xl px-3 py-3 ring-1 transition-colors',
                      inactive
                        ? 'bg-slate-50 ring-slate-200 opacity-80'
                        : 'bg-slate-50/80 ring-border',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        onClick={() => toggleExpand(type.id)}
                        aria-expanded={expanded}
                      >
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{
                            background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})`,
                          }}
                        >
                          {(type.name || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{type.name}</p>
                          <p className="text-xs text-slate-400">
                            {type.valuesCount ?? values.length} value
                            {(type.valuesCount ?? values.length) === 1 ? '' : 's'}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            'ml-auto size-4 shrink-0 text-slate-400 transition-transform duration-200',
                            expanded ? 'rotate-180' : '',
                          )}
                        />
                      </button>

                      <div
                        className="flex flex-wrap items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EntityStatusToggle
                          status={inactive ? 'inactive' : 'active'}
                          loading={statusUpdatingId === type.id}
                          onChange={(nextActive) => patchStatus('type', type, nextActive)}
                        />
                        {!inactive ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => openCreateValue(type)}
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
                          onClick={() => openEditType(type)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="cursor-pointer text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110"
                          title="Delete"
                          aria-label={`Delete ${type.name || 'variant type'}`}
                          onClick={() => requestDelete('type', type)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {expanded ? (
                      <ul className="mt-3 space-y-2 border-t border-border/70 pt-3">
                        {values.length === 0 ? (
                          <li className="rounded-lg bg-white px-2.5 py-3 text-sm text-slate-400 ring-1 ring-border">
                            No values yet. Use Add Values to create one.
                          </li>
                        ) : (
                          values.map((value) => (
                            <li
                              key={value.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-border"
                            >
                              <span className="truncate text-sm font-medium text-slate-800">
                                {value.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <EntityStatusToggle
                                  status={value.isActive === false ? 'inactive' : 'active'}
                                  loading={statusUpdatingId === value.id}
                                  onChange={(nextActive) =>
                                    patchStatus('value', value, nextActive)
                                  }
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110"
                                  title="Edit"
                                  onClick={() => openEditValue(value)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="cursor-pointer text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110"
                                  title="Delete"
                                  aria-label={`Delete ${value.name || 'variant value'}`}
                                  onClick={() => requestDelete('value', value)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </SurfaceCard>
      </MotionReveal>

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
