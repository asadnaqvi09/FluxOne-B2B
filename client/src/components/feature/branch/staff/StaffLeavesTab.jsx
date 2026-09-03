import { useEffect, useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Calendar, Users } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
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
import { apiClient } from '@/api/api'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

const PAGE_SIZE = 8

export function StaffLeavesTab({ designations = [], staff = [] }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [step, setStep] = useState(1)
  const [page, setPage] = useState(1)

  // Leave Form State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [filterDesignation, setFilterDesignation] = useState('')

  const fetchLeaves = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/leaves')
    setLoading(false)
    if (res.success) {
      setLeaves(res.data || [])
    }
  }

  useEffect(() => {
    void fetchLeaves()
  }, [])

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

  const handleNextStep = () => {
    if (!startDate || !endDate) return toastError('Please select both start and end dates')
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
    if (selectedEmployees.length === 0) {
      return toastError('Please select at least one employee')
    }

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

  const filteredStaff = staff.filter((m) => {
    if (filterDesignation && m.designationId !== filterDesignation) return false
    return true
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Leaves log list */}
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
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs text-slate-500 uppercase">
                  <TableHead className="px-3 py-2 font-medium">Employee</TableHead>
                  <TableHead className="px-3 py-2 font-medium">Leave Dates</TableHead>
                  <TableHead className="px-3 py-2 font-medium">Reason</TableHead>
                  <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                      No active leave records found
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((l) => (
                      <TableRow key={l.id} className="hover:bg-slate-50/50">
                        <TableCell className="px-3 py-3">
                          <div className="font-semibold text-slate-900">{l.fullName || 'Employee'}</div>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {new Date(l.startDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}{' '}
                          —{' '}
                          {new Date(l.endDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-700 italic max-w-xs truncate">
                          {l.reason || 'Leave'}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            {l.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={Math.max(1, Math.ceil(leaves.length / PAGE_SIZE))}
            totalItems={leaves.length}
            onPageChange={setPage}
          />
        </SurfaceCard>
      </div>

      {/* 2-Step Leave Application Form */}
      <div>
        <SurfaceCard title="Apply Leave" description="Register single or bulk employee leaves">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200">
                <strong>Step 1:</strong> Configure leave dates and reason.
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="leave-start">Start Date</Label>
                    <Input
                      id="leave-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      required
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
                      required
                    />
                  </div>
                </div>
                {dateError && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">{dateError}</p>
                )}
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
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/3"
                  onClick={() => setStep(1)}
                >
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
    </div>
  )
}
export default StaffLeavesTab
