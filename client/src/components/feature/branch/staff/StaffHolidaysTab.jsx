import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Users,
  Clock,
  Briefcase,
} from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

const PAGE_SIZE = 8

function formatDateDisplay(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return '—'
  const s = formatDateDisplay(startDate)
  const e = endDate ? formatDateDisplay(endDate) : s
  return `${s} – ${e}`
}

function calculateCalendarDays(startDate, endDate) {
  if (!startDate) return 0
  const s = new Date(startDate)
  const e = new Date(endDate || startDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  if (s > e) return 0
  const diffTime = Math.abs(e.getTime() - s.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diffDays)
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
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const [allStaff, setAllStaff] = useState(staff)
  const [allDesignations, setAllDesignations] = useState(designations)

  useEffect(() => {
    if (staff && staff.length > 0) {
      setAllStaff(staff)
    } else {
      void apiClient
        .get(endpoints.branch.staff.list, { limit: 100, status: 'active' })
        .then((res) => {
          if (res.success && res.data) {
            setAllStaff(res.data.items || res.data || [])
          }
        })
    }
  }, [staff])

  useEffect(() => {
    if (designations && designations.length > 0) {
      setAllDesignations(designations)
    } else {
      void apiClient
        .get(endpoints.branch.designations.list, { limit: 100, active: 'active' })
        .then((res) => {
          if (res.success && res.data) {
            setAllDesignations(res.data.items || res.data || [])
          }
        })
    }
  }, [designations])

  // Form Dialog States (Create / Edit)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formIsAllEmployees, setFormIsAllEmployees] = useState(true)
  const [formEmployeeIds, setFormEmployeeIds] = useState([])
  const [formStatus, setFormStatus] = useState('active')
  const [staffPickerSearch, setStaffPickerSearch] = useState('')
  const [staffPickerDesignation, setStaffPickerDesignation] = useState('')

  // View Modal State
  const [viewingTarget, setViewingTarget] = useState(null)

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchHolidays = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/holidays')
    setLoading(false)
    if (res.success) {
      setHolidays(res.data || [])
    } else {
      toastError(res.error || 'Failed to load holidays')
    }
  }

  useEffect(() => {
    void fetchHolidays()
  }, [])

  // Filter holidays by Holiday Name
  const filteredHolidays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return holidays
    return holidays.filter((h) => String(h.name || '').toLowerCase().includes(q))
  }, [holidays, searchQuery])

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  // Calculated calendar days for the form
  const formCalculatedDays = useMemo(() => {
    return calculateCalendarDays(formStartDate, formEndDate)
  }, [formStartDate, formEndDate])

  const formDateError =
    formStartDate && formEndDate && new Date(formStartDate) > new Date(formEndDate)
      ? 'Start date cannot be after end date'
      : ''

  // Filtered staff list for the Specific Employees picker
  const filteredStaffForPicker = useMemo(() => {
    return allStaff.filter((member) => {
      if (staffPickerDesignation && member.designationId !== staffPickerDesignation) {
        return false
      }
      if (staffPickerSearch.trim()) {
        const q = staffPickerSearch.trim().toLowerCase()
        const nameMatch = String(member.fullName || member.name || '').toLowerCase().includes(q)
        const desigMatch = String(member.designation || '').toLowerCase().includes(q)
        if (!nameMatch && !desigMatch) return false
      }
      return true
    })
  }, [allStaff, staffPickerDesignation, staffPickerSearch])

  // Reset form fields
  const resetForm = () => {
    setFormName('')
    setFormStartDate('')
    setFormEndDate('')
    setFormIsAllEmployees(true)
    setFormEmployeeIds([])
    setFormStatus('active')
    setStaffPickerSearch('')
    setStaffPickerDesignation('')
    setEditingId(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setDialogMode('create')
    setDialogOpen(true)
  }

  const handleOpenEdit = (holiday) => {
    resetForm()
    setDialogMode('edit')
    setEditingId(holiday.id)
    setFormName(holiday.name || '')
    setFormStartDate(toInputDate(holiday.startDate || holiday.holidayDate))
    setFormEndDate(toInputDate(holiday.endDate || holiday.startDate || holiday.holidayDate))
    setFormIsAllEmployees(holiday.isAllEmployees !== false)
    setFormEmployeeIds(holiday.employeeIds || [])
    setFormStatus(holiday.status || 'active')
    setDialogOpen(true)
  }

  const handleOpenView = (holiday) => {
    setViewingTarget(holiday)
  }

  const handleToggleEmployeeId = (empId) => {
    setFormEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    )
  }

  const handleSelectAllFilteredStaff = () => {
    const ids = filteredStaffForPicker.map((s) => s.id)
    const allSelected = ids.every((id) => formEmployeeIds.includes(id))
    if (allSelected) {
      setFormEmployeeIds((prev) => prev.filter((id) => !ids.includes(id)))
    } else {
      setFormEmployeeIds((prev) => {
        const next = [...prev]
        ids.forEach((id) => {
          if (!next.includes(id)) next.push(id)
        })
        return next
      })
    }
  }

  const handleSaveHoliday = async (e) => {
    e?.preventDefault()
    if (!formName.trim()) return toastError('Holiday name is required')
    if (!formStartDate) return toastError('Start date is required')
    if (!formEndDate) return toastError('End date is required')
    if (formDateError) return toastError(formDateError)
    if (!formIsAllEmployees && formEmployeeIds.length === 0) {
      return toastError('Please select at least one employee or choose "All Employees"')
    }

    setMutating(true)
    const payload = {
      name: formName.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      isAllEmployees: formIsAllEmployees,
      employeeIds: formIsAllEmployees ? [] : formEmployeeIds,
      status: formStatus,
    }

    let res
    if (dialogMode === 'edit' && editingId) {
      res = await apiClient.put(`/branch/holidays/${editingId}`, payload)
    } else {
      res = await apiClient.post('/branch/holidays', payload)
    }

    setMutating(false)
    if (res.success) {
      toastSuccess(dialogMode === 'edit' ? 'Holiday schedule updated' : 'Holiday schedule created')
      setDialogOpen(false)
      resetForm()
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to save holiday schedule')
    }
  }

  const handleDeleteHoliday = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/holidays/${deleteTarget.id}`)
    setMutating(false)
    if (res.success) {
      toastSuccess('Holiday schedule deleted')
      setDeleteTarget(null)
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to delete holiday schedule')
    }
  }

  // Pagination slice
  const pageRows = filteredHolidays.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredHolidays.length / PAGE_SIZE))

  return (
    <div className="space-y-5">
      <SurfaceCard
        title="Holiday Schedule"
        description="Configure and manage company and branch holiday calendars"
        actions={
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="cursor-pointer text-white shadow-xs"
            style={{ background: BRAND.purple }}
          >
            <Plus className="size-4" />
            Add Holiday
          </Button>
        }
      >
        {/* Search Bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by holiday name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-xs font-medium text-slate-500">
            Showing {filteredHolidays.length} {filteredHolidays.length === 1 ? 'record' : 'records'}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Loading holiday schedules…
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-purple-50 text-purple-700">
              <Calendar className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              No holiday schedules found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Click "Add Holiday" above to schedule a new holiday.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {pageRows.map((h) => (
                <article
                  key={h.id}
                  className="rounded-xl border border-border bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{h.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatDateRange(h.startDate || h.holidayDate, h.endDate)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        h.status === 'active'
                          ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
                          : 'border-slate-200 bg-slate-50 font-semibold text-slate-600'
                      }
                    >
                      {h.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <span className="text-slate-400">No. of Days:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {h.noOfDays || calculateCalendarDays(h.startDate || h.holidayDate, h.endDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Employees:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {h.isAllEmployees
                          ? `All (${h.noOfEmployees || h.totalActiveStaff || staff.length})`
                          : h.noOfEmployees || h.employeeIds?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenView(h)}
                      className="cursor-pointer text-slate-600"
                    >
                      <Eye className="mr-1 size-3.5" /> View
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(h)}
                      className="cursor-pointer text-slate-600"
                    >
                      <Pencil className="mr-1 size-3.5" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(h)}
                      className="cursor-pointer text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="mr-1 size-3.5" /> Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
              <Table className="w-full text-left text-sm">
                <TableHeader className="bg-slate-100/90 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Holiday Name
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Date Range
                    </TableHead>
                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700">
                      No. of Days
                    </TableHead>
                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700">
                      No. of Employees
                    </TableHead>
                    <TableHead className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700">
                      Status
                    </TableHead>
                    <TableHead className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider text-slate-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((h) => {
                    const days =
                      h.noOfDays ||
                      calculateCalendarDays(h.startDate || h.holidayDate, h.endDate)
                    const employeeCount = h.isAllEmployees
                      ? h.noOfEmployees || h.totalActiveStaff || staff.length
                      : h.noOfEmployees || h.employeeIds?.length || 0

                    return (
                      <TableRow
                        key={h.id}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Holiday Name */}
                        <TableCell className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-purple-600" />
                            {h.name}
                          </div>
                        </TableCell>

                        {/* Date Range */}
                        <TableCell className="py-3.5 px-4 font-medium text-slate-700">
                          {formatDateRange(h.startDate || h.holidayDate, h.endDate)}
                        </TableCell>

                        {/* No. of Days */}
                        <TableCell className="py-3.5 px-4 text-center font-semibold text-slate-800">
                          <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                            {days} {days === 1 ? 'day' : 'days'}
                          </span>
                        </TableCell>

                        {/* No. of Employees */}
                        <TableCell className="py-3.5 px-4 text-center font-semibold text-slate-800">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                              h.isAllEmployees
                                ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Users className="size-3" />
                            {employeeCount}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={
                              h.status === 'active'
                                ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
                                : 'border-slate-200 bg-slate-50 font-semibold text-slate-600'
                            }
                          >
                            {h.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="View details"
                              onClick={() => handleOpenView(h)}
                              className="size-8 cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Edit holiday"
                              onClick={() => handleOpenEdit(h)}
                              className="size-8 cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Delete holiday"
                              onClick={() => setDeleteTarget(h)}
                              className="size-8 cursor-pointer text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Bottom Pagination & Records Count */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-row">
          <div className="text-xs text-slate-500">
            {filteredHolidays.length > 0 ? (
              <>
                Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
                {Math.min(page * PAGE_SIZE, filteredHolidays.length)} of{' '}
                {filteredHolidays.length} holiday schedules
              </>
            ) : null}
          </div>

          <div className="flex justify-end">
            <TablePagination
              page={page}
              pageCount={totalPages}
              totalItems={filteredHolidays.length}
              onPageChange={setPage}
            />
          </div>
        </div>
      </SurfaceCard>

      {/* Add / Edit Holiday Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-purple-50 text-purple-700">
                <Calendar className="size-4" />
              </div>
              {dialogMode === 'edit' ? 'Edit Holiday Schedule' : 'Add Holiday Schedule'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'edit'
                ? 'Update holiday schedule details and employee assignments.'
                : 'Configure holiday details, date range, and employee assignments.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHoliday} className="space-y-4 pt-1">
            {/* Holiday Name */}
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name" className="text-xs font-semibold">
                Holiday Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Saudi National Day, Eid Holidays"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            {/* Date Range & Calculated Days */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="holiday-start-date" className="text-xs font-semibold">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="holiday-start-date"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className={formDateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="holiday-end-date" className="text-xs font-semibold">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="holiday-end-date"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className={formDateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  required
                />
              </div>
            </div>

            {formDateError ? (
              <p className="text-xs font-medium text-red-600">{formDateError}</p>
            ) : null}

            {/* Read-Only Calculated Days Banner */}
            <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3.5 py-2.5 text-xs text-purple-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="size-4 text-purple-600" />
                No. of Calendar Days (calculated):
              </span>
              <span className="font-extrabold text-sm text-purple-950">
                {formCalculatedDays} {formCalculatedDays === 1 ? 'day' : 'days'}
              </span>
            </div>

            {/* Employee Assignment Scope */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <Label className="text-xs font-semibold">
                Applicable Employees <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                    formIsAllEmployees
                      ? 'border-purple-600 bg-purple-50/50 text-purple-950 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="empScope"
                    checked={formIsAllEmployees}
                    onChange={() => setFormIsAllEmployees(true)}
                    className="text-purple-600 focus:ring-purple-500 size-4"
                  />
                  <div className="text-xs">
                    <div>All Employees</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {allStaff.length} active staff
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                    !formIsAllEmployees
                      ? 'border-purple-600 bg-purple-50/50 text-purple-950 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="empScope"
                    checked={!formIsAllEmployees}
                    onChange={() => setFormIsAllEmployees(false)}
                    className="text-purple-600 focus:ring-purple-500 size-4"
                  />
                  <div className="text-xs">
                    <div>Specific Employees</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {formEmployeeIds.length} selected
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Specific Employee Selection Picker */}
            {!formIsAllEmployees && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Search employee or designation…"
                    value={staffPickerSearch}
                    onChange={(e) => setStaffPickerSearch(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                  <NativeSelect
                    value={staffPickerDesignation}
                    onChange={(e) => setStaffPickerDesignation(e.target.value)}
                    className="h-8 text-xs bg-white"
                  >
                    <option value="">All Designations</option>
                    {allDesignations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 pt-1 text-xs">
                  <span className="font-semibold text-slate-600">
                    Staff List ({filteredStaffForPicker.length})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleSelectAllFilteredStaff}
                    className="h-6 text-xs text-purple-700 hover:bg-purple-100/60"
                  >
                    {filteredStaffForPicker.every((s) => formEmployeeIds.includes(s.id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {filteredStaffForPicker.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      No employees match your filter
                    </p>
                  ) : (
                    filteredStaffForPicker.map((member) => {
                      const isChecked = formEmployeeIds.includes(member.id)
                      return (
                        <label
                          key={member.id}
                          className={`flex items-start gap-2.5 rounded-lg border p-2 cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-purple-200 bg-purple-50/70'
                              : 'border-slate-100 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEmployeeId(member.id)}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 size-4 border-slate-300"
                          />
                          <div className="min-w-0 flex-1 leading-tight">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {member.fullName || member.name}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Briefcase className="size-3 text-slate-400" />
                              {member.designation || 'Staff'}
                            </p>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Status Field */}
            <div className="space-y-1.5">
              <Label htmlFor="holiday-status" className="text-xs font-semibold">
                Status
              </Label>
              <NativeSelect
                id="holiday-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={mutating}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="cursor-pointer text-white font-semibold shadow-xs"
                style={{ background: BRAND.purple }}
              >
                {mutating ? 'Saving…' : dialogMode === 'edit' ? 'Save Changes' : 'Create Holiday'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Holiday Details Dialog (Read-Only) */}
      <Dialog open={Boolean(viewingTarget)} onOpenChange={(open) => !open && setViewingTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-purple-50 text-purple-700">
                <Eye className="size-4" />
              </div>
              Holiday Schedule Details
            </DialogTitle>
            <DialogDescription>
              Read-only overview of the scheduled holiday.
            </DialogDescription>
          </DialogHeader>

          {viewingTarget && (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-medium">Holiday Name:</span>
                  <span className="font-bold text-slate-900 text-right">{viewingTarget.name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Date Range:</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateRange(viewingTarget.startDate || viewingTarget.holidayDate, viewingTarget.endDate)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">No. of Calendar Days:</span>
                  <span className="font-bold text-slate-800">
                    {viewingTarget.noOfDays ||
                      calculateCalendarDays(
                        viewingTarget.startDate || viewingTarget.holidayDate,
                        viewingTarget.endDate,
                      )}{' '}
                    days
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <Badge
                    variant="outline"
                    className={
                      viewingTarget.status === 'active'
                        ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
                        : 'border-slate-200 bg-slate-50 font-semibold text-slate-600'
                    }
                  >
                    {viewingTarget.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Employees Assigned Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-purple-600" />
                    Applicable Employees:
                  </span>
                  <span>
                    {viewingTarget.isAllEmployees
                      ? `All Employees (${viewingTarget.noOfEmployees || viewingTarget.totalActiveStaff || allStaff.length})`
                      : `${viewingTarget.assignedEmployees?.length || viewingTarget.employeeIds?.length || 0} Employees`}
                  </span>
                </div>

                {!viewingTarget.isAllEmployees && viewingTarget.assignedEmployees?.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-2 space-y-1.5">
                    {viewingTarget.assignedEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{emp.fullName}</p>
                          <p className="text-[10px] text-slate-400">{emp.designation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewingTarget(null)}
                  className="cursor-pointer w-full"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Holiday Schedule?"
        description={
          deleteTarget
            ? `Are you sure you want to delete “${deleteTarget.name}” (${formatDateRange(
                deleteTarget.startDate || deleteTarget.holidayDate,
                deleteTarget.endDate,
              )})? Corresponding holiday attendance marks will be cleared.`
            : ''
        }
        confirmLabel="Delete Schedule"
        loading={mutating}
        onConfirm={handleDeleteHoliday}
      />
    </div>
  )
}

export default StaffHolidaysTab
