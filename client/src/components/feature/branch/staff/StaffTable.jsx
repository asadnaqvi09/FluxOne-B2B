import { Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { displayStaffRef } from '@/lib/formatDisplayId'

// Joining Date/Time per Doc v4 (date + time when available)
function formatJoinedDateTime(value) {
  if (!value) return '—'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    <RowActionButtons
      onEdit={() => onEdit?.(row)}
      onDelete={() => onDelete?.(row)}
      editLabel={`Edit ${row.fullName || 'staff'}`}
      deleteLabel={`Delete ${row.fullName || 'staff'}`}
    />
  )
}

// Open/Block control (Doc v4); maps to active / inactive on the API
function StaffStatusToggle({ row, loading, onChange }) {
  return (
    <EntityStatusToggle
      status={row.status}
      loading={loading}
      onChange={(nextActive) => onChange?.(row, nextActive)}
      activeLabel="Open"
      inactiveLabel="Block"
      activeTitle="Click to block"
      inactiveTitle="Click to open"
    />
  )
}

// Branch staff table: Staff ID | Name | Joining Date/Time | Designation | Scheduling | Assigned hardware | Status | Actions
export function StaffTable({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
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
  const pageSize = pagination?.limit || 8
  const totalItems = pagination?.total ?? list.length

  // Standard pagination below the table (tc-Resources-02q)
  const paginationBar =
    !loading && totalItems > 0 ? (
      <TablePagination
        page={page}
        pageCount={pageCount}
        totalItems={totalItems}
        pageSize={pageSize}
        loading={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        alwaysShow
      />
    ) : null

  return (
    <SurfaceCard
      className={className}
      title="Team roster"
      description="Branch staff roles for this location"
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
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {list.map((row) => {
              const staffId = displayStaffRef(row)
              const joinedAt = formatJoinedDateTime(row.joiningDate || row.createdAt)
              return (
                <article
                  key={row.id || staffId}
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
                          <p
                            title={row.id || undefined}
                            className="truncate font-mono text-[11px] font-semibold text-purple-800"
                          >
                            {staffId}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {row.email || '—'}
                          </p>
                        </div>
                        <StaffStatusToggle
                          row={row}
                          loading={statusUpdatingId === row.id}
                          onChange={onStatusChange}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{designationLabel(row)}</p>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p>Joined {joinedAt}</p>
                        <p className="text-slate-600">
                          <ScheduleBlock row={row} />
                        </p>
                        {row.hardwareName || row.hardwareCode || row.hardwareDeviceId ? (
                          <p className="truncate">
                            {row.hardwareName || row.hardwareCode || row.hardwareDeviceId}
                            {row.hardwareName && row.hardwareCode ? (
                              <span className="text-slate-400"> · {row.hardwareCode}</span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <StaffRowActions row={row} onEdit={onEdit} onDelete={onDelete} />
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Desktop table — Doc v4 column order */}
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[56rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                  <TableHead className="px-2 py-2.5 font-medium">Staff ID</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Name</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Joining Date/Time</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Designation</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Scheduling</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Assigned hardware</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Status</TableHead>
                  <TableActionsHead className="px-2 py-2.5 font-medium" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => {
                  const staffId = displayStaffRef(row)
                  return (
                    <TableRow key={row.id || staffId} className="hover:bg-slate-50/80">
                      <TableCell className="px-2 py-3 align-middle">
                        <span
                          title={row.id || undefined}
                          className="font-mono text-xs font-bold text-purple-800 select-all"
                        >
                          {staffId}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            name={row.fullName}
                            imageUrl={row.imageUrl}
                            className="size-9 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {row.fullName || '—'}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {row.email || '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle whitespace-nowrap text-slate-600">
                        {formatJoinedDateTime(row.joiningDate || row.createdAt)}
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle text-slate-700">
                        {designationLabel(row)}
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle text-xs text-slate-600">
                        <ScheduleBlock row={row} />
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle text-slate-600">
                        {row.hardwareName ? (
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{row.hardwareName}</p>
                            {row.hardwareCode ? (
                              <p className="truncate font-mono text-[11px] text-slate-400">
                                {row.hardwareCode}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          row.hardwareCode || row.hardwareDeviceId || '—'
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle">
                        <StaffStatusToggle
                          row={row}
                          loading={statusUpdatingId === row.id}
                          onChange={onStatusChange}
                        />
                      </TableCell>
                      <TableActionsCell>
                        <StaffRowActions row={row} onEdit={onEdit} onDelete={onDelete} />
                      </TableActionsCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {paginationBar}
    </SurfaceCard>
  )
}
