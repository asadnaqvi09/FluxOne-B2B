import { useMemo, useState } from 'react'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { CategoryDialog } from '@/components/feature/products/CategoryDialog'
import { ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { useProducts } from '@/hooks/useProducts'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

function filterCategoryRows(catalog, statusFilter) {
  const allRows = (catalog.parents || []).map((parent) => ({
    parent,
    children: catalog.childrenByParent.get(parent.id) || [],
  }))

  if (statusFilter === 'all') return allRows

  if (statusFilter === 'active') {
    return allRows
      .filter(({ parent }) => parent.isActive !== false)
      .map(({ parent, children }) => ({
        parent,
        children: children.filter((child) => child.isActive !== false),
      }))
  }

  return allRows
    .map(({ parent, children }) => {
      const inactiveChildren = children.filter((child) => child.isActive === false)
      if (parent.isActive === false) {
        return { parent, children: inactiveChildren }
      }
      if (inactiveChildren.length > 0) {
        return { parent, children: inactiveChildren }
      }
      return null
    })
    .filter(Boolean)
}

export function CategoriesPage() {
  const {
    catalog,
    catalogLoading,
    mutating,
    createCategory,
    updateCategory,
    deleteCategory,
    setCategoryActive,
  } = useProducts({}, { skipList: true })

  // Default Active so soft-deleted categories disappear from the main list (like products)
  const [statusFilter, setStatusFilter] = useState('active')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState('create')
  const [dialogKind, setDialogKind] = useState('category')
  const [editing, setEditing] = useState(null)
  const [parentForSub, setParentForSub] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const rows = useMemo(() => filterCategoryRows(catalog, statusFilter), [catalog, statusFilter])

  function openCreateCategory() {
    setDialogKind('category')
    setDialogMode('create')
    setEditing(null)
    setParentForSub(null)
    setDialogOpen(true)
  }

  function openCreateSub(parent) {
    setDialogKind('subcategory')
    setDialogMode('create')
    setEditing(null)
    setParentForSub(parent)
    setDialogOpen(true)
  }

  function openEdit(row, kind) {
    setDialogKind(kind)
    setDialogMode('edit')
    setEditing(row)
    setParentForSub(null)
    setDialogOpen(true)
  }

  async function handleSubmit({ name, image }) {
    let result
    if (dialogMode === 'edit' && editing?.id) {
      result = await updateCategory(editing.id, { name, image })
    } else if (dialogKind === 'subcategory') {
      result = await createCategory({
        name,
        image,
        parentId: parentForSub?.id,
      })
    } else {
      result = await createCategory({ name, image })
    }

    if (result.success) {
      toastSuccess(
        dialogMode === 'edit'
          ? 'Saved'
          : dialogKind === 'subcategory'
            ? 'Sub category created'
            : 'Category created',
      )
    } else {
      toastError(result.error || 'Request failed')
    }
    return result
  }

  async function handleStatusChange(row, isActive) {
    if (!row?.id) return
    if (!isActive) {
      setDeactivateTarget(row)
      return
    }
    setStatusUpdatingId(row.id)
    try {
      const result = await setCategoryActive(row.id, true)
      if (result.success) toastSuccess('Category activated')
      else toastError(result.error || 'Activate failed')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget?.id) return
    setStatusUpdatingId(deactivateTarget.id)
    try {
      const result = await setCategoryActive(deactivateTarget.id, false)
      setDeactivateTarget(null)
      if (result.success) {
        toastSuccess(
          deactivateTarget.parentId
            ? 'Sub category deactivated — products show Subcategory N/A'
            : 'Category deactivated — products keep Active with Category N/A',
        )
      } else {
        toastError(result.error || 'Deactivate failed')
      }
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await deleteCategory(deleteTarget.id)
      setDeleteTarget(null)
      if (result.success) {
        toastSuccess(
          deleteTarget.parentId
            ? 'Sub category deleted'
            : 'Category deleted — linked sub categories were deactivated',
        )
      } else {
        toastError(result.error || 'Delete failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Categories"
          description="Manage parent and sub categories — delete or deactivate when unused"
          actions={
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="category-status-filter" className="sr-only">
                  Status
                </Label>
                <NativeSelect
                  id="category-status-filter"
                  value={statusFilter}
                  className="min-w-[8.5rem]"
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </NativeSelect>
              </div>
              <Button
                type="button"
                className="cursor-pointer text-white"
                style={{ background: BRAND.purple }}
                onClick={openCreateCategory}
              >
                <Plus className="size-4" />
                Category
              </Button>
            </div>
          }
        />
      </MotionHeader>

      <MotionReveal delay={0.06}>
        <SurfaceCard
          title="Category tree"
          description="Parent categories and sub categories"
          actions={
            <span className="text-xs text-slate-400">
              {rows.length} parent
              {rows.length === 1 ? '' : 's'}
              {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
            </span>
          }
        >
          {catalogLoading ? (
            <TableRowsSkeleton rows={4} />
          ) : !rows.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
              <FolderTree className="size-8 text-slate-300" />
              <p>
                {statusFilter === 'all'
                  ? 'No categories yet. Create a parent category first.'
                  : statusFilter === 'active'
                    ? 'No active categories.'
                    : 'No inactive categories.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map(({ parent, children }) => (
                <li
                  key={parent.id}
                  className={`rounded-xl px-3 py-3 ring-1 ${
                    parent.isActive === false
                      ? 'bg-slate-50 ring-slate-200 opacity-80'
                      : 'bg-slate-50/80 ring-border'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {parent.imageUrl ? (
                        <img
                          src={parent.imageUrl}
                          alt=""
                          className="size-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="flex size-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{
                            background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})`,
                          }}
                        >
                          {parent.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{parent.name}</p>
                        <p className="text-xs text-slate-400">
                          {children.length} sub categor
                          {children.length === 1 ? 'y' : 'ies'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ProductStatusToggle
                        status={parent.isActive === false ? 'inactive' : 'active'}
                        loading={statusUpdatingId === parent.id}
                        onChange={(status) =>
                          handleStatusChange(parent, status === 'active')
                        }
                      />
                      {parent.isActive !== false ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => openCreateSub(parent)}
                        >
                          <Plus className="size-3.5" />
                          Sub category
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="cursor-pointer"
                        title="Edit"
                        onClick={() => openEdit(parent, 'category')}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="cursor-pointer text-red-600 hover:text-red-700"
                        title="Delete"
                        aria-label={`Delete ${parent.name || 'category'}`}
                        onClick={() => setDeleteTarget(parent)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {children.length ? (
                    <ul className="mt-3 space-y-2 border-t border-border/70 pt-3">
                      {children.map((child) => (
                        <li
                          key={child.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-border"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {child.imageUrl ? (
                              <img
                                src={child.imageUrl}
                                alt=""
                                className="size-7 rounded object-cover"
                              />
                            ) : null}
                            <span className="truncate text-sm font-medium text-slate-800">
                              {child.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ProductStatusToggle
                              status={child.isActive === false ? 'inactive' : 'active'}
                              loading={statusUpdatingId === child.id}
                              onChange={(status) =>
                                handleStatusChange(child, status === 'active')
                              }
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer"
                              title="Edit"
                              onClick={() => openEdit(child, 'subcategory')}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer text-red-600 hover:text-red-700"
                              title="Delete"
                              aria-label={`Delete ${child.name || 'sub category'}`}
                              onClick={() => setDeleteTarget(child)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </MotionReveal>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initial={editing}
        title={dialogKind === 'subcategory' ? 'Sub category' : 'Category'}
        loading={mutating}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
        title="Deactivate category?"
        description={
          deactivateTarget?.parentId
            ? `“${deactivateTarget.name}” will be inactive. Products keep Active; subcategory becomes N/A.`
            : `“${deactivateTarget?.name}” and its sub categories will be inactive. Products stay Active with Category N/A.`
        }
        confirmLabel="Deactivate"
        loading={mutating || Boolean(statusUpdatingId)}
        onConfirm={handleConfirmDeactivate}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={deleteTarget?.parentId ? 'Delete sub category?' : 'Delete category?'}
        description={
          deleteTarget?.parentId
            ? `“${deleteTarget.name}” will be removed from the active catalog. Linked products keep Active with Subcategory N/A.`
            : `“${deleteTarget?.name}” and its sub categories will be removed from the active catalog. Linked products stay Active with Category N/A.`
        }
        confirmLabel="Delete"
        loading={deleteLoading || mutating}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default CategoriesPage
