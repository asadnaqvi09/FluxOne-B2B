import { useEffect, useState, useMemo } from 'react'
import { Calendar, Users, ArrowRight, ArrowLeft, Check, CheckSquare } from 'lucide-react'
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

export function StaffHolidaysTab({ designations = [], staff = [] }) {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [page, setPage] = useState(1)

  // 2-step form state
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [filterDesignation, setFilterDesignation] = useState('')

  const fetchHolidays = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/holidays')
    setLoading(false)
    if (res.success) {
      setHolidays(res.data || [])
    }
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

  const handleNextStep = () => {
    if (!name.trim()) return toastError('Holiday name is required')
    if (!startDate || !endDate) return toastError('Please select both dates')
    if (dateError) return
    setStep(2)
  }

  const handleCheckboxToggle = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    )
  }

  const handleSelectAllFiltered = (filteredStaff) => {
    const filteredIds = filteredStaff.map((s) => s.id)
    const allSelected = filteredIds.every((id) => selectedEmployees.includes(id))

    if (allSelected) {
      // Remove all filtered from selected
      setSelectedEmployees((prev) => prev.filter((id) => !filteredIds.includes(id)))
    } else {
      // Add missing filtered to selected
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
    if (selectedEmployees.length === 0) {
      return toastError('Please select at least one employee')
    }

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

  // Filter employees for Step 2 checklist
  const filteredStaff = staff.filter((m) => {
    if (filterDesignation && m.designationId !== filterDesignation) return false
    return true
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* List of holidays */}
      <div className="lg:col-span-2">
        <SurfaceCard
          title="Branch Holiday Schedule"
          description="Scheduled store closures and holidays"
          actions={
            <span className="text-xs font-medium text-slate-400">
              {holidays.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs text-slate-500 uppercase">
                  <TableHead className="px-3 py-2 font-medium">Holiday Date</TableHead>
                  <TableHead className="px-3 py-2 font-medium">Holiday Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={2} className="py-8 text-center text-slate-400">Loading...</TableCell></TableRow>
                ) : holidays.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="py-8 text-center text-slate-400">No holidays scheduled</TableCell></TableRow>
                ) : (
                  holidays
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((h) => (
                      <TableRow key={h.id} className="hover:bg-slate-50/50">
                        <TableCell className="px-3 py-3 font-semibold text-slate-900">
                          {new Date(h.holidayDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-700">{h.name}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={Math.max(1, Math.ceil(holidays.length / PAGE_SIZE))}
            totalItems={holidays.length}
            onPageChange={setPage}
          />
        </SurfaceCard>
      </div>

      {/* Add Holiday Form */}
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
                <div className="grid grid-cols-2 gap-3">
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
                {dateError && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">{dateError}</p>
                )}
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
                <span><strong>Step 2:</strong> Checklist selected employees.</span>
                <Button variant="ghost" size="xs" onClick={() => setStep(1)} className="p-0 h-auto text-emerald-900 underline">
                  <ArrowLeft className="mr-0.5 size-3 inline" /> Back
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Filter by Designation</Label>
                <NativeSelect value={filterDesignation} onChange={(e) => setFilterDesignation(e.target.value)}>
                  <option value="">All Designations</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
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
                    <label key={m.id} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(m.id)}
                        onChange={() => handleCheckboxToggle(m.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 size-4 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{m.fullName}</div>
                        <div className="text-[10px] text-slate-400">{m.designation || 'No designation'}</div>
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
    </div>
  )
}
export default StaffHolidaysTab
