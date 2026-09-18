import { useMemo, useState } from 'react'
import {
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  ArrowDownUp,
  Printer,
} from 'lucide-react'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from '@/components/ui/table'
import { useClientPagination } from '@/hooks/useClientPagination'
import { referenceFromUuid } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

function formatPolicyUpdatedAt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ active }) {
  const isActive = active !== false
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        isActive
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200',
      )}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: isActive ? '#22c55e' : '#94a3b8' }}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function CategoryBadge({ category, config }) {
  const cfg = config || {}
  const Icon = cfg.icon || FileText
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold',
        cfg.badgeClass,
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{category || 'Uncategorized'}</span>
    </Badge>
  )
}

function PolicyActionsMenu({ policy, onView, onEdit, onDelete }) {
  return (
    <div className="relative inline-flex justify-start">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Policy actions"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[9rem]" align="start">
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-slate-700"
            onClick={() => onView?.(policy)}
          >
            <Eye className="size-3.5" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-slate-700"
            onClick={() => onEdit?.(policy)}
          >
            <Pencil className="size-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-red-600 hover:bg-red-50"
            onClick={() => onDelete?.(policy)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SortableHead({ label, active, direction, onClick, className }) {
  return (
    <TableHead className={cn('px-3 py-3 font-semibold', className)}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex cursor-pointer items-center gap-1 text-left text-xs tracking-wide text-slate-500 uppercase hover:text-slate-800"
      >
        {label}
        <ArrowDownUp
          className={cn('size-3 text-slate-400 opacity-40', active && 'opacity-100 text-slate-600')}
          data-dir={direction}
        />
      </button>
    </TableHead>
  )
}

export function PoliciesTable({
  items = [],
  loading = false,
  mutating = false,
  categoryConfig = {},
  onView,
  onEdit,
  onDelete,
  onTogglePrintOnSlip,
}) {
  const [sortKey, setSortKey] = useState('updatedAt')
  const [sortDir, setSortDir] = useState('desc')
  const [togglingId, setTogglingId] = useState(null)

  const sorted = useMemo(() => {
    const list = [...(items || [])]
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortKey === 'name') {
        return String(a.name || '').localeCompare(String(b.name || '')) * dir
      }
      if (sortKey === 'category') {
        return String(a.category || '').localeCompare(String(b.category || '')) * dir
      }
      if (sortKey === 'id') {
        return (
          referenceFromUuid(a.id, 'POL').localeCompare(referenceFromUuid(b.id, 'POL')) * dir
        )
      }
      if (sortKey === 'status') {
        const av = a.isActive === false ? 0 : 1
        const bv = b.isActive === false ? 0 : 1
        return (av - bv) * dir
      }
      if (sortKey === 'printOnSlip') {
        const av = a.printOnSlip ? 1 : 0
        const bv = b.printOnSlip ? 1 : 0
        return (av - bv) * dir
      }
      const at = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bt = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return (at - bt) * dir
    })
    return list
  }, [items, sortKey, sortDir])

  const { page, setPage, pageSize, setPageSize, pageCount, total, slice } =
    useClientPagination(sorted)

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'category' || key === 'id' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  async function handleTogglePrint(policy, next) {
    if (!onTogglePrintOnSlip) return
    setTogglingId(policy.id)
    await onTogglePrintOnSlip(policy, next)
    setTogglingId(null)
  }

  const isEmpty = !loading && total === 0

  return (
    <SurfaceCard
      title="Policies & Governance"
      description="Corporate protocols enforced across branch portals. Toggle Print on Slip to show a policy on POS invoices."
    >
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading policies…</p>
      ) : isEmpty ? (
        <EmptyState
          icon={FileText}
          title="No corporate policies found"
          description="Try searching with a different keyword or create a new policy."
          compact
        />
      ) : (
        <>
          <ResponsiveDataShell
            mobile={slice.map((p) => {
              const cfg = categoryConfig[p.category] || categoryConfig['Retail Operations']
              const displayId = referenceFromUuid(p.id, 'POL')
              return (
                <DataCard key={p.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-mono text-xs font-bold text-purple-700">{displayId}</p>
                      <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                      <CategoryBadge category={p.category} config={cfg} />
                    </div>
                    <PolicyActionsMenu
                      policy={p}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <StatusBadge active={p.isActive} />
                    <EntityStatusToggle
                      active={Boolean(p.printOnSlip)}
                      loading={mutating && togglingId === p.id}
                      onChange={(next) => handleTogglePrint(p, next)}
                      activeLabel="Print on slip"
                      inactiveLabel="Slip off"
                      activeTitle="Click to hide this policy on POS invoices"
                      inactiveTitle="Click to print this policy on POS invoices"
                    />
                    <span>{formatPolicyUpdatedAt(p.updatedAt || p.createdAt)}</span>
                  </div>
                </DataCard>
              )
            })}
            desktop={
              <Table className="min-w-[58rem] text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                    <SortableHead
                      label="Policy ID"
                      active={sortKey === 'id'}
                      direction={sortDir}
                      onClick={() => toggleSort('id')}
                    />
                    <SortableHead
                      label="Policy Name"
                      active={sortKey === 'name'}
                      direction={sortDir}
                      onClick={() => toggleSort('name')}
                    />
                    <SortableHead
                      label="Category"
                      active={sortKey === 'category'}
                      direction={sortDir}
                      onClick={() => toggleSort('category')}
                    />
                    <SortableHead
                      label="Status"
                      active={sortKey === 'status'}
                      direction={sortDir}
                      onClick={() => toggleSort('status')}
                    />
                    <SortableHead
                      label="Print on Slip"
                      active={sortKey === 'printOnSlip'}
                      direction={sortDir}
                      onClick={() => toggleSort('printOnSlip')}
                    />
                    <SortableHead
                      label="Last Updated"
                      active={sortKey === 'updatedAt'}
                      direction={sortDir}
                      onClick={() => toggleSort('updatedAt')}
                    />
                    <TableHead className="px-3 py-3 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((p) => {
                    const cfg =
                      categoryConfig[p.category] || categoryConfig['Retail Operations']
                    const displayId = referenceFromUuid(p.id, 'POL')
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/80">
                        <TableCell className="px-3 py-3 font-mono text-xs font-bold text-purple-800">
                          {displayId}
                        </TableCell>
                        <TableCell className="px-3 py-3 font-medium text-slate-900">
                          {p.name}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <CategoryBadge category={p.category} config={cfg} />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <StatusBadge active={p.isActive} />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="inline-flex items-center gap-1.5">
                            <Printer
                              className={cn(
                                'size-3.5',
                                p.printOnSlip ? 'text-emerald-600' : 'text-slate-300',
                              )}
                            />
                            <EntityStatusToggle
                              active={Boolean(p.printOnSlip)}
                              loading={mutating && togglingId === p.id}
                              onChange={(next) => handleTogglePrint(p, next)}
                              activeLabel="On"
                              inactiveLabel="Off"
                              activeTitle="Click to hide this policy on POS invoices"
                              inactiveTitle="Click to print this policy on POS invoices"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap text-slate-600">
                          {formatPolicyUpdatedAt(p.updatedAt || p.createdAt)}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <PolicyActionsMenu
                            policy={p}
                            onView={onView}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            }
          />

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </SurfaceCard>
  )
}

export default PoliciesTable
