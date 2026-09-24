import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
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
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'
import { validateLeaveForm } from '@/lib/validation/branchForms'

const PAGE_SIZE = 8

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

export function StaffLeavesTab({ designations = [], staff = [] }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [step, setStep] = useState(1)
  const [page, setPage] = useState(1)
  const [listDesignation, setListDesignation] = useState('')

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [filterDesignation, setFilterDesignation] = useState('')

  const [editing, setEditing] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editStatus, setEditStatus] = useState('approved')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchLeaves = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/leaves', {
      designationId: listDesignation || undefined,
    })
    setLoading(false)
    if (res.success) setLeaves(res.data || [])
  }

  useEffect(() => {
    void fetchLeaves()
  }, [listDesignation])

  useEffect(() => {
    setPage(1)
  }, [listDesignation, leaves.length])

  const resetForm = () => {
    setStep(1)
    setStartDate('')
    setEndDate('')
    setReason('')
    setSelectedEmployees([])
    setFilterDesignation('')
  }

  const dateError =
    startDate && endDate && new Date(startDate) > new Date(endDate)
      ? 'Start date cannot be after end date'
      : ''

  const editDateError =
    editStart && editEnd && new Date(editStart) > new Date(editEnd)
      ? 'Start date cannot be after end date'
      : ''

  const handleNextStep = () => {
    const validationError = validateLeaveForm({ reason, startDate, endDate })
    if (validationError) return toastError(validationError)
    if (dateError) return
    setStep(2)
  }

  const handleCheckboxToggle = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    )
  }

  const handleSelectAllFiltered = (filteredStaff) => {
    const filteredIds = filteredStaff.map((s) => s.id)
    const allSelected = filteredIds.every((id) => selectedEmployees.includes(id))
    if (allSelected) {
      setSelectedEmployees((prev) => prev.filter((id) => !filteredIds.includes(id)))
    } else {
      setSelectedEmployees((prev) => {
        const next = [...prev]
        filteredIds.forEach((id) => {
          if (!next.includes(id)) next.push(id)
        })
        return next
      })
    }
  }

  const handleSaveLeave = async () => {
    if (selectedEmployees.length === 0) return toastError('Please select at least one employee')
    setMutating(true)
    const res = await apiClient.post('/branch/leaves', {
      employeeIds: selectedEmployees,
      startDate,
      endDate,
      reason,
    })
    setMutating(false)
    if (res.success) {
      toastSuccess('Leave recorded and scheduled successfully')
      resetForm()
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to submit leave request')
    }
  }

  const openEdit = (row) => {
    setEditing(row)
    setEditStart(toInputDate(row.startDate))
    setEditEnd(toInputDate(row.endDate))
    setEditReason(row.reason || '')
    setEditStatus(row.status || 'approved')
  }

  const handleUpdateLeave = async () => {
    if (!editing) return
    if (!editStart || !editEnd) return toastError('Please select both dates')
    if (editDateError) return
    setMutating(true)
    const res = await apiClient.put(`/branch/leaves/${editing.id}`, {
      startDate: editStart,
      endDate: editEnd,
      reason: editReason,
      status: editStatus,
    })
    setMutating(false)
    if (res.success) {
      toastSuccess('Leave updated')
      setEditing(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to update leave')
    }
  }

  const handleDeleteLeave = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/leaves/${deleteTarget.id}`)
    setMutating(false)
    if (res.success) {
      toastSuccess('Leave deleted')
      setDeleteTarget(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to delete leave')
    }
  }

  const filteredStaff = staff.filter((m) => {
    if (filterDesignation && m.designationId !== filterDesignation) return false
    return true
  })

  const pageRows = useMemo(
    () => leaves.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [leaves, page],
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SurfaceCard
          title="Active Leave Roster"
          description="Recorded leave records for branch employees"
          actions={
            <span className="text-xs font-medium text-slate-400">
              {leaves.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="mb-4 max-w-xs">
            <Label className="mb-1.5 block text-xs text-slate-500">Filter by Designation</Label>
            <NativeSelect
              value={listDesignation}
              onChange={(e) => setListDesignation(e.target.value)}
            >
              <option value="">All Designations</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : leaves.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No active leave records found</p>
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
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {l.fullName || 'Employee'}
                        </p>
                        <p className="text-[11px] text-slate-500">{l.designation || '—'}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatRange(l.startDate, l.endDate)}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500 italic">
                          {l.reason || 'Leave'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles(l.status)}`}
                        >
                          {l.status}
                        </span>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(l)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-rose-600"
                            onClick={() => setDeleteTarget(l)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="w-full min-w-[40rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-3 py-2 font-medium">Employee</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Designation</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Leave Dates</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Reason</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                      <TableHead className="px-3 py-2 text-right font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((l) => (
                      <TableRow key={l.id} className="hover:bg-slate-50/50">
                        <TableCell className="px-3 py-3 font-semibold text-slate-900">
                          {l.fullName || 'Employee'}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {l.designation || '—'}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {formatRange(l.startDate, l.endDate)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate px-3 py-3 text-slate-700 italic">
                          {l.reason || 'Leave'}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles(l.status)}`}
                          >
                            {l.status}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(l)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-rose-600"
                            onClick={() => setDeleteTarget(l)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
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
            pageCount={Math.max(1, Math.ceil(leaves.length / PAGE_SIZE))}
            totalItems={leaves.length}
            onPageChange={setPage}
          />
        </SurfaceCard>
      </div>

      <div>
        <SurfaceCard title="Apply Leave" description="Register single or bulk employee leaves">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200">
                <strong>Step 1:</strong> Configure leave dates and reason.
              </div>
              <div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="leave-start">Start Date</Label>
                    <Input
                      id="leave-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="leave-end">End Date</Label>
                    <Input
                      id="leave-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                  </div>
                </div>
                {dateError && <p className="mt-1.5 text-xs font-medium text-red-500">{dateError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leave-reason">Reason / Note</Label>
                <Input
                  id="leave-reason"
                  placeholder="e.g. Sick Leave, Annual Leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleNextStep}
                className="w-full text-white"
                style={{ backgroundColor: BRAND.purple }}
              >
                Next: Select Employees
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 text-emerald-800 p-2 text-xs border border-emerald-100 flex items-center justify-between">
                <span>
                  <strong>Step 2:</strong> Select single or multiple employees.
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setStep(1)}
                  className="p-0 h-auto text-emerald-900 underline hover:bg-transparent"
                >
                  <ArrowLeft className="mr-0.5 size-3 inline" /> Back
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label>Filter by Designation</Label>
                <NativeSelect
                  value={filterDesignation}
                  onChange={(e) => setFilterDesignation(e.target.value)}
                >
                  <option value="">All Designations</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto p-2 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border mb-1">
                  <span className="text-xs font-bold text-slate-500">
                    Selected ({selectedEmployees.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleSelectAllFiltered(filteredStaff)}
                    className="h-6 text-xs text-slate-600 border border-slate-200"
                  >
                    Select All
                  </Button>
                </div>
                {filteredStaff.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No employees in filter</p>
                ) : (
                  filteredStaff.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(m.id)}
                        onChange={() => handleCheckboxToggle(m.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 size-4 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{m.fullName}</div>
                        <div className="text-[10px] text-slate-400">
                          {m.designation || 'No designation'}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={mutating}
                  onClick={handleSaveLeave}
                  className="w-2/3 text-white"
                  style={{ backgroundColor: BRAND.purple }}
                >
                  {mutating ? 'Saving…' : 'Apply & Save'}
                </Button>
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave</DialogTitle>
            <DialogDescription>
              Update leave for {editing?.fullName || 'employee'}.
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
            {editDateError && <p className="text-xs font-medium text-red-500">{editDateError}</p>}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <NativeSelect value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="approved">approved</option>
                <option value="pending">pending</option>
                <option value="cancelled">cancelled</option>
                <option value="rejected">rejected</option>
              </NativeSelect>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateLeave}
              disabled={mutating}
              className="text-white cursor-pointer"
              style={{ backgroundColor: BRAND.purple }}
            >
              {mutating ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete leave?"
        description={
          deleteTarget
            ? `Remove leave for ${deleteTarget.fullName} (${formatRange(deleteTarget.startDate, deleteTarget.endDate)}) and clear related leave attendance.`
            : ''
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleDeleteLeave}
      />
    </div>
  )
}

export default StaffLeavesTab
