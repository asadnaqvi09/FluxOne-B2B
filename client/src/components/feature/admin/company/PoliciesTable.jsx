import { useMemo, useState } from 'react'
import { FileText, Printer } from 'lucide-react'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
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
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { cn } from '@/lib/utils'

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

function PolicyTypeBadge({ category, config }) {
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

// Direct View / Edit / Delete icons (no ⋮ menu) — TC-admin action view-002g
function PolicyRowActions({ policy, onView, onEdit, onDelete }) {
  const name = policy?.name || 'policy'
  return (
    <RowActionButtons
      onView={onView ? () => onView(policy) : undefined}
      onEdit={onEdit ? () => onEdit(policy) : undefined}
      onDelete={onDelete ? () => onDelete(policy) : undefined}
      viewLabel={`View ${name}`}
      editLabel={`Edit ${name}`}
      deleteLabel={`Delete ${name}`}
    />
  )
}

const DEFAULT_POLICY_TYPE = 'Return'

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
  const [togglingId, setTogglingId] = useState(null)

  // Newest first — headers are display-only (no sort UI)
  const sorted = useMemo(() => {
    const list = [...(items || [])]
    list.sort((a, b) => {
      const at = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bt = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return bt - at
    })
    return list
  }, [items])

  const { page, setPage, pageSize, setPageSize, pageCount, total, slice } =
    useClientPagination(sorted)

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
      description="Corporate protocols enforced across branch portals. Enable a policy to show it on POS invoice slips."
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
              const cfg = categoryConfig[p.category] || categoryConfig[DEFAULT_POLICY_TYPE]
              const displayId = referenceFromUuid(p.id, 'POL')
              return (
                <DataCard key={p.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-mono text-xs font-bold text-purple-700">{displayId}</p>
                      <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                      <PolicyTypeBadge category={p.category} config={cfg} />
                    </div>
                    <PolicyRowActions
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
                      activeLabel="Enabled"
                      inactiveLabel="Disabled"
                      activeTitle="Click to disable — hide this policy on POS invoices"
                      inactiveTitle="Click to enable — show this policy on POS invoices"
                    />
                    <span><DateTimeLines value={p.updatedAt || p.createdAt} /></span>
                  </div>
                </DataCard>
              )
            })}
            desktop={
              <Table className="min-w-[58rem] text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                    <TableHead className="px-3 py-3 font-semibold">Policy ID</TableHead>
                    <TableHead className="px-3 py-3 font-semibold">Policy Name</TableHead>
                    <TableHead className="px-3 py-3 font-semibold">Policy Type</TableHead>
                    <TableHead className="px-3 py-3 font-semibold">Printability status</TableHead>
                    <TableHead className="px-3 py-3 font-semibold">Last Updated</TableHead>
                    <TableHead className="px-3 py-3 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((p) => {
                    const cfg =
                      categoryConfig[p.category] || categoryConfig[DEFAULT_POLICY_TYPE]
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
                          <PolicyTypeBadge category={p.category} config={cfg} />
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
                              activeLabel="Enabled"
                              inactiveLabel="Disabled"
                              activeTitle="Click to disable — hide this policy on POS invoices"
                              inactiveTitle="Click to enable — show this policy on POS invoices"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap text-slate-600">
                          <DateTimeLines value={p.updatedAt || p.createdAt} />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <PolicyRowActions
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
