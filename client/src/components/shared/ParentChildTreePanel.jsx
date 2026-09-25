import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { TablePagination } from '@/components/ui/table'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

const DEFAULT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

//
// Reusable parent/child tree UI (Categories layout).
// No View dropdown — expand/collapse via per-parent chevron only.
// Domain actions stay in the caller via render slots.
//
export function ParentChildTreePanel({
  // Toolbar
  search = '',
  onSearchChange,
  searchId = 'tree-search',
  searchLabel = 'Search',
  searchPlaceholder = 'Search…',
  status = 'all',
  onStatusChange,
  statusId = 'tree-status-filter',
  statusLabel = 'Status',
  statusOptions = DEFAULT_STATUS_OPTIONS,
  toolbarActions = null,

  // Tree card
  title = 'Tree',
  description = '',
  countLabel = null,
  emptyIcon,
  emptyTitle = 'Nothing here yet.',
  loading = false,

  // Rows: { id, name, isActive, children[], imageUrl?, metaLabel? }
  rows = [],
  openIds,
  onToggleParent,

  // Slots
  renderParentAvatar,
  renderParentMeta,
  renderParentActions,
  renderChild,
  renderChildEmpty,

  // Optional pagination (pass null to hide)
  pagination = null,

  className,
}) {
  const showPagination = Boolean(pagination) && rows.length > 0 && !loading

  return (
    <div className={cn('space-y-5 sm:space-y-6', className)}>
      {/* Search → Status → actions (no View) */}
      <MotionReveal delay={0.02}>
        <SurfaceCard padding="compact">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={searchId}>{searchLabel}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id={searchId}
                  value={search}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                  onChange={(event) => onSearchChange?.(event.target.value)}
                />
              </div>
            </div>

            <div className="w-full space-y-1.5 sm:w-40">
              <Label htmlFor={statusId}>{statusLabel}</Label>
              <NativeSelect
                id={statusId}
                value={status}
                onChange={(event) => onStatusChange?.(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {toolbarActions ? (
              <div className="flex flex-wrap items-center gap-2 xl:pb-0.5">{toolbarActions}</div>
            ) : null}
          </div>
        </SurfaceCard>
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <SurfaceCard
          title={title}
          description={description}
          actions={
            countLabel ? (
              <span className="text-xs text-slate-400">{countLabel}</span>
            ) : null
          }
        >
          {loading ? (
            <TableRowsSkeleton rows={4} />
          ) : !rows.length ? (
            <EmptyState icon={emptyIcon} title={emptyTitle} compact />
          ) : (
            <>
              <ul className="space-y-3">
                {rows.map((parent) => {
                  const children = parent.children || []
                  const isOpen = openIds?.has?.(parent.id)
                  const canToggle = children.length > 0 || Boolean(renderChildEmpty)
                  const inactive = parent.isActive === false

                  return (
                    <li
                      key={parent.id}
                      className={cn(
                        'rounded-xl px-3 py-3 ring-1',
                        inactive
                          ? 'bg-slate-50 ring-slate-200 opacity-80'
                          : 'bg-slate-50/80 ring-border',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {/* Chevron — only when expand makes sense */}
                          {canToggle ? (
                            <button
                              type="button"
                              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900"
                              aria-expanded={Boolean(isOpen)}
                              aria-label={
                                isOpen
                                  ? `Collapse ${parent.name}`
                                  : `Expand ${parent.name}`
                              }
                              onClick={() => onToggleParent?.(parent.id)}
                            >
                              {isOpen ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex size-7 shrink-0" aria-hidden="true" />
                          )}

                          {renderParentAvatar ? (
                            renderParentAvatar(parent)
                          ) : (
                            <DefaultParentAvatar parent={parent} />
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {parent.name}
                            </p>
                            {renderParentMeta ? (
                              renderParentMeta(parent, children)
                            ) : parent.metaLabel ? (
                              <p className="text-xs text-slate-400">{parent.metaLabel}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {renderParentActions?.(parent, children)}
                        </div>
                      </div>

                      {isOpen ? (
                        <ul className="mt-3 space-y-2 border-t border-border/70 pt-3 pl-9">
                          {children.length === 0 ? (
                            renderChildEmpty ? (
                              <li>{renderChildEmpty(parent)}</li>
                            ) : null
                          ) : (
                            children.map((child) => (
                              <li
                                key={child.id}
                                className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-border"
                              >
                                {renderChild?.(child, parent)}
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>

              {showPagination ? (
                <TablePagination
                  page={pagination.page}
                  pageCount={pagination.pageCount}
                  totalItems={pagination.total}
                  pageSize={pagination.pageSize}
                  loading={loading}
                  onPageChange={pagination.onPageChange}
                  onPageSizeChange={pagination.onPageSizeChange}
                />
              ) : null}
            </>
          )}
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

function DefaultParentAvatar({ parent }) {
  if (parent.imageUrl) {
    return (
      <img
        src={parent.imageUrl}
        alt=""
        className="size-10 rounded-lg object-cover"
      />
    )
  }

  return (
    <div
      className="flex size-10 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{
        background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})`,
      }}
    >
      {String(parent.name || '?')
        .slice(0, 1)
        .toUpperCase()}
    </div>
  )
}

export default ParentChildTreePanel
