import { Pencil, Trash2, Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { displayStaffRef } from '@/lib/formatDisplayId'

function formatJoined(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatTime(value) {
  if (!value) return '—'
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

function designationLabel(row) {
  if (row?.designation) return row.designation
  if (row?.role === 'inventory_manager') return 'Inventory Manager'
  if (row?.role === 'cashier') return 'Cashier'
  if (row?.role === 'website_manager') return 'Website Manager'
  if (row?.role === 'production_staff') return 'Production Staff'
  if (row?.role === 'delivery_staff') return 'Delivery Staff'
  return '—'
}

function ScheduleBlock({ row }) {
  return (
    <>
      <span className="whitespace-nowrap">
        {formatTime(row.scheduleStart)} – {formatTime(row.scheduleEnd)}
      </span>
      {row.scheduleBreakStart || row.scheduleBreakEnd ? (
        <span className="mt-0.5 block text-slate-400">
          Break {formatTime(row.scheduleBreakStart)}
          {row.scheduleBreakEnd ? ` – ${formatTime(row.scheduleBreakEnd)}` : ''}
        </span>
      ) : null}
    </>
  )
}

function StaffRowActions({ row, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Edit ${row.fullName || 'staff'}`}
        onClick={() => onEdit?.(row)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Delete ${row.fullName || 'staff'}`}
        className="text-slate-500 transition-colors hover:bg-transparent hover:text-slate-800"
        onClick={() => onDelete?.(row)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

// Branch staff table — mobile cards + desktop table
export function StaffTable({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onStatusChange,
  statusUpdatingId = null,
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = pagination?.pageCount || 1

  return (
    <SurfaceCard
      className={className}
      title="Team roster"
      description="Branch staff roles for this location"
      actions={
        <span className="text-xs font-medium text-slate-400">
          {pagination?.total ?? list.length} records · {pagination?.limit || 8} / page
        </span>
      }
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={Users}
          title="No staff available"
          description="Add an Inventory Manager or Cashier to get started."
          compact
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    name={row.fullName}
                    imageUrl={row.imageUrl}
                    className="size-10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.fullName || '—'}
                        </p>
                        <p className="truncate font-mono text-[11px] text-purple-700">
                          {displayStaffRef(row)}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {row.email || '—'}
                        </p>
                      </div>
                      <EntityStatusToggle
                        status={row.status}
                        loading={statusUpdatingId === row.id}
                        onChange={(nextActive) => onStatusChange?.(row, nextActive)}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{designationLabel(row)}</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <p>Joined {formatJoined(row.joiningDate || row.createdAt)}</p>
                      <p className="text-slate-600">
                        <ScheduleBlock row={row} />
                      </p>
                      {row.hardwareDeviceId ? (
                        <p className="truncate">Device {row.hardwareDeviceId}</p>
                      ) : null}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <StaffRowActions row={row} onEdit={onEdit} onDelete={onDelete} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[56rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                  <TableHead className="px-2 py-2.5 font-medium">Code</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Name</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Joined</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Designation</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Schedule</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Hardware</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Status</TableHead>
                  <TableHead className="px-2 py-2.5 text-right font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/80">
                    <TableCell className="px-2 py-3 font-mono text-xs text-slate-600">
                      <div>
                        <p className="font-semibold text-purple-800">{displayStaffRef(row)}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{row.email || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={row.fullName}
                          imageUrl={row.imageUrl}
                          className="size-9"
                        />
                        <p className="truncate font-semibold text-slate-900">
                          {row.fullName || '—'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-600">
                      {formatJoined(row.joiningDate || row.createdAt)}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-700">
                      {designationLabel(row)}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-xs text-slate-600">
                      <ScheduleBlock row={row} />
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-600">
                      {row.hardwareDeviceId || '—'}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <EntityStatusToggle
                        status={row.status}
                        loading={statusUpdatingId === row.id}
                        onChange={(nextActive) => onStatusChange?.(row, nextActive)}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <div className="flex items-center justify-end">
                        <StaffRowActions row={row} onEdit={onEdit} onDelete={onDelete} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={pagination?.total ?? list.length}
            loading={loading}
            onPageChange={onPageChange}
            alwaysShow={(pagination?.total || 0) > (pagination?.limit || 8)}
          />
        </>
      )}
    </SurfaceCard>
  )
}
