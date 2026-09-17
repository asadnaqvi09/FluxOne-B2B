import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowLeft, Pencil, Trash2 } from 'lucide-react'
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
import { validateHolidayForm } from '@/lib/validation/branchForms'
import { useClientPagination } from '@/hooks/useClientPagination'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toInputDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

export function StaffHolidaysTab({ designations = [], staff = [] }) {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [listSearch, setListSearch] = useState('')

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [filterDesignation, setFilterDesignation] = useState('')

  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchHolidays = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/holidays')
    setLoading(false)
    if (res.success) setHolidays(res.data || [])
  }

  useEffect(() => {
    void fetchHolidays()
  }, [])

  const resetForm = () => {
    setStep(1)
    setName('')
    setStartDate('')
    setEndDate('')
    setSelectedEmployees([])
    setFilterDesignation('')
  }

  const dateError =
    startDate && endDate && new Date(startDate) > new Date(endDate)
      ? 'Start date cannot be after end date'
      : ''

  const filteredList = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    if (!q) return holidays
    return holidays.filter((h) => String(h.name || '').toLowerCase().includes(q))
  }, [holidays, listSearch])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(filteredList)

  useEffect(() => {
    setPage(1)
  }, [listSearch, setPage])

  const handleNextStep = () => {
    const validationError = validateHolidayForm({ name, startDate, endDate })
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

  const handleSaveHoliday = async () => {
    if (selectedEmployees.length === 0) return toastError('Please select at least one employee')
    setMutating(true)
    const res = await apiClient.post('/branch/holidays', {
      name,
      startDate,
      endDate,
      employeeIds: selectedEmployees,
    })
    setMutating(false)
    if (res.success) {
      toastSuccess('Holiday added and marked on employee attendance sheets')
      resetForm()
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to save holiday')
    }
  }

  const openEdit = (row) => {
    setEditing(row)
    setEditName(row.name || '')
    setEditDate(toInputDate(row.holidayDate))
  }

  const handleUpdateHoliday = async () => {
    if (!editing) return
    if (!editName.trim()) return toastError('Holiday name is required')
    if (!editDate) return toastError('Holiday date is required')
    setMutating(true)
    const res = await apiClient.put(`/branch/holidays/${editing.id}`, {
      name: editName.trim(),
      holidayDate: editDate,
    })
    setMutating(false)
    if (res.success) {
      toastSuccess('Holiday updated')
      setEditing(null)
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to update holiday')
    }
  }

  const handleDeleteHoliday = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/holidays/${deleteTarget.id}`)
    setMutating(false)
    if (res.success) {
      toastSuccess('Holiday deleted')
      setDeleteTarget(null)
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to delete holiday')
    }
  }

  const filteredStaff = staff.filter((m) => {
    if (filterDesignation && m.designationId !== filterDesignation) return false
    return true
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SurfaceCard
          title="Branch Holiday Schedule"
          description="Scheduled store closures and holidays"
        >
          <div className="mb-4">
            <Input
              placeholder="Filter holidays by name…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : filteredList.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No holidays scheduled</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {pageRows.map((h) => (
                  <article
                    key={h.id}
                    className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                        <p className="mt-1 text-xs text-slate-600">{formatDate(h.holidayDate)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(h)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-rose-600"
                          onClick={() => setDeleteTarget(h)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-3 py-2 font-medium">Holiday Date</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Holiday Name</TableHead>
                      <TableHead className="px-3 py-2 text-right font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((h) => (
                      <TableRow key={h.id} className="hover:bg-slate-50/50">
                        <TableCell className="px-3 py-3 font-semibold text-slate-900">
                          {formatDate(h.holidayDate)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-700">{h.name}</TableCell>
                        <TableCell className="px-3 py-3 text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(h)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-rose-600"
                            onClick={() => setDeleteTarget(h)}
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
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </SurfaceCard>
      </div>

      <div>
        <SurfaceCard title="Add Holiday Schedule" description="Register a holiday and apply to team roster">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500 border border-slate-200">
                <strong>Step 1:</strong> Configure holiday details and dates.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holiday-name">Holiday Name</Label>
                <Input
                  id="holiday-name"
                  placeholder="e.g. Independence Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="holiday-start">Start Date</Label>
                    <Input
                      id="holiday-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="holiday-end">End Date</Label>
                    <Input
                      id="holiday-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                  </div>
                </div>
                {dateError && <p className="mt-1.5 text-xs font-medium text-red-500">{dateError}</p>}
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
                  <strong>Step 2:</strong> Checklist selected employees.
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setStep(1)}
                  className="p-0 h-auto text-emerald-900 underline"
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
                  <span className="text-xs font-bold text-slate-500">Apply to Filtered</span>
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
                <Button variant="outline" onClick={() => setStep(1)} className="w-1/2">
                  Back
                </Button>
                <Button
                  onClick={handleSaveHoliday}
                  disabled={mutating}
                  className="w-1/2 text-white"
                  style={{ backgroundColor: BRAND.purple }}
                >
                  {mutating ? 'Saving…' : 'Apply Holiday'}
                </Button>
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>Update holiday name or date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Holiday Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Holiday Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogCancelButton onClick={() => setEditing(null)}>Cancel</DialogCancelButton>
            <Button
              onClick={handleUpdateHoliday}
              disabled={mutating}
              className="text-white"
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
        title="Delete holiday?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.name}” on ${formatDate(deleteTarget.holidayDate)} and clear related holiday attendance marks.`
            : ''
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleDeleteHoliday}
      />
    </div>
  )
}

export default StaffHolidaysTab
