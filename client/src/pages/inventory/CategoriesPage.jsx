import { useMemo, useState } from 'react'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { CategoryDialog } from '@/components/feature/products/CategoryDialog'
import { ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { MotionHeader } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { ParentChildTreePanel } from '@/components/shared/ParentChildTreePanel'
import { Button } from '@/components/ui/button'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useProducts } from '@/hooks/useProducts'
import { filterParentChildRows } from '@/lib/filterParentChildRows'
import { TABLE_PAGE_SIZE } from '@/lib/tablePagination'
import { toastError, toastSuccess } from '@/lib/toast'

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

  // Default Active so soft-deleted categories disappear from the main list
  const [statusFilter, setStatusFilter] = useState('active')
  const [query, setQuery] = useState('')
  // Parents the user has expanded via chevron
  const [openIds, setOpenIds] = useState(() => new Set())

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState('create')
  const [dialogKind, setDialogKind] = useState('category')
  const [editing, setEditing] = useState(null)
  const [parentForSub, setParentForSub] = useState(null)
  // Toolbar "Add Sub Category" asks for a parent inside the dialog
  const [pickParent, setPickParent] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Normalize catalog → shared tree row shape
  const treeRows = useMemo(() => {
    return (catalog.parents || []).map((parent) => {
      const children = catalog.childrenByParent.get(parent.id) || []
      return {
        id: parent.id,
        name: parent.name,
        isActive: parent.isActive,
        imageUrl: parent.imageUrl,
        parentId: parent.parentId,
        children: children.map((child) => ({
          id: child.id,
          name: child.name,
          isActive: child.isActive,
          imageUrl: child.imageUrl,
          parentId: child.parentId,
        })),
        // Keep raw refs for dialogs / status handlers
        _raw: parent,
        _rawChildren: children,
      }
    })
  }, [catalog])

  const rows = useMemo(
    () => filterParentChildRows(treeRows, statusFilter, query),
    [treeRows, statusFilter, query],
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

  function openCreateCategory() {
    setDialogKind('category')
    setDialogMode('create')
    setEditing(null)
    setParentForSub(null)
    setPickParent(false)
    setDialogOpen(true)
  }

  function openCreateSub(parent) {
    // Toolbar add needs at least one active parent
    if (!parent) {
      const choices = (catalog.parents || []).filter((row) => row.isActive !== false)
      if (!choices.length) {
        toastError('Create a parent category first')
        return
      }
    }
    setDialogKind('subcategory')
    setDialogMode('create')
    setEditing(null)
    setParentForSub(parent?._raw || parent || null)
    setPickParent(!parent)
    setDialogOpen(true)
  }

  function openEdit(row, kind) {
    setDialogKind(kind)
    setDialogMode('edit')
    setEditing(row._raw || row)
    setParentForSub(null)
    setPickParent(false)
    setDialogOpen(true)
  }

  async function handleSubmit({ name, image, parentId }) {
    let result
    if (dialogMode === 'edit' && editing?.id) {
      result = await updateCategory(editing.id, { name, image })
    } else if (dialogKind === 'subcategory') {
      result = await createCategory({
        name,
        image,
        parentId: parentForSub?.id || parentId,
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
    const target = row._raw || row
    if (!target?.id) return
    if (!isActive) {
      setDeactivateTarget(target)
      return
    }
    setStatusUpdatingId(target.id)
    try {
      const result = await setCategoryActive(target.id, true)
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

  async function handleSoftDeleteCategory() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await setCategoryActive(deleteTarget.id, false)
      setDeleteTarget(null)
      if (result.success) {
        toastSuccess(
          deleteTarget.parentId
            ? 'Sub category deactivated — products show Subcategory N/A'
            : 'Category deactivated — products keep Active with Category N/A',
        )
      } else {
        toastError(result.error || 'Deactivate failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleHardDeleteCategory() {
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

  const deleteCategoryIsActive = deleteTarget?.isActive !== false

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Categories"
          description="Manage parent and sub categories — delete or deactivate when unused"
        />
      </MotionHeader>

      <ParentChildTreePanel
        search={query}
        onSearchChange={(value) => {
          setQuery(value)
          setPage(1)
        }}
        searchId="category-search"
        searchPlaceholder="Search category, sub category or keyword..."
        status={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value)
          setPage(1)
        }}
        statusId="category-status-filter"
        toolbarActions={
          <>
            <Button type="button" variant="outline" onClick={openCreateCategory}>
              <Plus className="size-4" />
              Add Category
            </Button>
            <Button type="button" variant="brand" onClick={() => openCreateSub(null)}>
              <Plus className="size-4" />
              Add Sub Category
            </Button>
          </>
        }
        title="Category tree"
        description="Parent categories and sub categories"
        countLabel={`${rows.length} parent${rows.length === 1 ? '' : 's'}${
          statusFilter !== 'all' ? ` · ${statusFilter}` : ''
        }`}
        emptyIcon={FolderTree}
        emptyTitle={
          query.trim()
            ? 'No categories match that search.'
            : statusFilter === 'all'
              ? 'No categories yet. Create a parent category first.'
              : statusFilter === 'active'
                ? 'No active categories.'
                : 'No inactive categories.'
        }
        loading={catalogLoading}
        rows={pageRows}
        openIds={openIds}
        onToggleParent={toggleParent}
        renderParentMeta={(_parent, children) => (
          <p className="text-xs text-slate-400">
            {children.length} sub categor{children.length === 1 ? 'y' : 'ies'}
          </p>
        )}
        renderParentActions={(parent) => (
          <>
            <ProductStatusToggle
              status={parent.isActive === false ? 'inactive' : 'active'}
              loading={statusUpdatingId === parent.id}
              onChange={(status) => handleStatusChange(parent, status === 'active')}
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
              className="cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110"
              title="Edit"
              onClick={() => openEdit(parent, 'category')}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="cursor-pointer text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110"
              title="Delete"
              aria-label={`Delete ${parent.name || 'category'}`}
              onClick={() => setDeleteTarget(parent._raw || parent)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
        renderChild={(child) => (
          <>
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
                onChange={(status) => handleStatusChange(child, status === 'active')}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110"
                title="Edit"
                onClick={() => openEdit(child, 'subcategory')}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110"
                title="Delete"
                aria-label={`Delete ${child.name || 'sub category'}`}
                onClick={() => setDeleteTarget(child)}
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initial={editing}
        title={dialogKind === 'subcategory' ? 'Sub category' : 'Category'}
        loading={mutating}
        parents={
          pickParent
            ? (catalog.parents || []).filter((row) => row.isActive !== false)
            : null
        }
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

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        entityName={deleteTarget?.name}
        title={
          deleteTarget?.parentId
            ? `Remove “${deleteTarget?.name}” sub category?`
            : `Remove “${deleteTarget?.name}” category?`
        }
        description={
          deleteTarget?.parentId
            ? `Prefer Inactive if products still reference this sub category. Permanent remove clears it from the catalog.`
            : `Prefer Inactive for “${deleteTarget?.name}” and its sub categories. Permanent remove clears them from the active catalog.`
        }
        softLabel="Set Inactive"
        softHint="Products stay Active with Category / Subcategory N/A. You can reactivate later."
        hardLabel="Permanently delete"
        showSoftAction={deleteCategoryIsActive}
        canHardDelete
        loading={deleteLoading || mutating}
        onSoftDelete={handleSoftDeleteCategory}
        onHardDelete={handleHardDeleteCategory}
      />
    </div>
  )
}

export default CategoriesPage
