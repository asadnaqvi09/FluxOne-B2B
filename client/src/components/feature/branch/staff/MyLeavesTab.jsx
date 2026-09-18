import { useEffect, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ActionIconButton, RowActionButtons } from '@/components/shared/ActionIconButton'
import { MyLeaveFormDialog } from '@/components/feature/branch/staff/MyLeaveFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { useClientPagination } from '@/hooks/useClientPagination'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatRange(start, end) {
  return `${formatDate(start)} — ${formatDate(end)}`
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toInputDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

function statusStyles(status) {
  if (status === 'cancelled' || status === 'rejected') {
    return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
  if (status === 'pending') {
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  }
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

// Decided leaves expose Admin note via view action
function canViewLeave(status) {
  return status === 'approved' || status === 'rejected'
}

// BM personal leave history — pending until Admin decides
export function MyLeavesTab({ createOpen = false, onCreateOpenChange }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)

  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editReason, setEditReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchLeaves = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/leaves/me')
    setLoading(false)
    if (res.success) setLeaves(res.data || [])
  }

  useEffect(() => {
    void fetchLeaves()
  }, [])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(leaves)

  useEffect(() => {
    setPage(1)
  }, [leaves.length, setPage])

  const editDateError =
    editStart && editEnd && new Date(editStart) > new Date(editEnd)
      ? 'Start date cannot be after end date'
      : ''

  const openEdit = (row) => {
    if (row.status !== 'pending') {
      return toastError('Only pending leave requests can be edited')
    }
    setEditing(row)
    setEditStart(toInputDate(row.startDate))
    setEditEnd(toInputDate(row.endDate))
    setEditReason(row.reason || '')
  }

  const handleUpdateLeave = async () => {
    if (!editing) return
    if (!editStart || !editEnd) return toastError('Please select both dates')
    if (editDateError) return

    setMutating(true)
    const res = await apiClient.put(`/branch/leaves/me/${editing.id}`, {
      startDate: editStart,
      endDate: editEnd,
      reason: editReason,
    })
    setMutating(false)

    if (res.success) {
      toastSuccess('Leave request updated')
      setEditing(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to update leave request')
    }
  }

  const handleDeleteLeave = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/leaves/me/${deleteTarget.id}`)
    setMutating(false)

    if (res.success) {
      toastSuccess('Leave request deleted')
      setDeleteTarget(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to delete leave request')
    }
  }

  return (
    <div className="space-y-4">
      <SurfaceCard
        title="My Leave Records"
        description="Your personal leave requests and Admin decisions"
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
        ) : leaves.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No leave requests yet</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {pageRows.map((l) => (
                <article
                  key={l.id}
                  className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {l.reason || 'Leave'}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatRange(l.startDate, l.endDate)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Applied {formatDateTime(l.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles(l.status)}`}
                      >
                        {l.status}
                      </span>
                      {l.status === 'pending' ? (
                        <RowActionButtons
                          onEdit={() => openEdit(l)}
                          onDelete={() => setDeleteTarget(l)}
                        />
                      ) : canViewLeave(l.status) ? (
                        <ActionIconButton action="view" onClick={() => setViewing(l)} />
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="w-full min-w-[44rem] text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs text-slate-500 uppercase">
                    <TableHead className="px-3 py-2 font-medium">Reason</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Leave Date Range</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Apply Date & Time</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/50">
                      <TableCell className="max-w-xs truncate px-3 py-3 font-semibold text-slate-900">
                        {l.reason || 'Leave'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-slate-600">
                        {formatRange(l.startDate, l.endDate)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-slate-600">
                        {formatDateTime(l.createdAt)}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles(l.status)}`}
                        >
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        {l.status === 'pending' ? (
                          <RowActionButtons
                            onEdit={() => openEdit(l)}
                            onDelete={() => setDeleteTarget(l)}
                          />
                        ) : canViewLeave(l.status) ? (
                          <ActionIconButton action="view" onClick={() => setViewing(l)} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <TablePagination
          page={page}
          pageCount={pageCount}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </SurfaceCard>

      <MyLeaveFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onSuccess={fetchLeaves}
      />

      // View Admin decision + note for decided leaves
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Details</DialogTitle>
            <DialogDescription>
              Review your leave request and Admin decision comments.
            </DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="space-y-2 py-2 text-sm">
              <p>
                <span className="text-slate-500">Reason:</span>{' '}
                <strong>{viewing.reason || 'Leave'}</strong>
              </p>
              <p>
                <span className="text-slate-500">Leave dates:</span>{' '}
                {formatRange(viewing.startDate, viewing.endDate)}
              </p>
              <p>
                <span className="text-slate-500">Applied:</span>{' '}
                {formatDateTime(viewing.createdAt)}
              </p>
              <p>
                <span className="text-slate-500">Status:</span>{' '}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles(viewing.status)}`}
                >
                  {viewing.status}
                </span>
              </p>
              {viewing.decidedAt ? (
                <p>
                  <span className="text-slate-500">Decided:</span>{' '}
                  {formatDateTime(viewing.decidedAt)}
                </p>
              ) : null}
              <p>
                <span className="text-slate-500">Admin note:</span>{' '}
                {viewing.decisionReason || '—'}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <DialogCancelButton onClick={() => setViewing(null)}>Close</DialogCancelButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>
              Update your pending leave dates or reason before Admin decides.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className={editDateError ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className={editDateError ? 'border-red-500' : ''}
                />
              </div>
            </div>
            {editDateError ? (
              <p className="text-xs font-medium text-red-500">{editDateError}</p>
            ) : null}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogCancelButton onClick={() => setEditing(null)}>Cancel</DialogCancelButton>
            <Button onClick={handleUpdateLeave} disabled={mutating} variant="brand">
              {mutating ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete leave request?"
        description={
          deleteTarget
            ? `Remove your pending request (${formatRange(deleteTarget.startDate, deleteTarget.endDate)})?`
            : ''
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleDeleteLeave}
      />
    </div>
  )
}

export default MyLeavesTab
