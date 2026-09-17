import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { StaffEmployeeChecklist } from '@/components/feature/branch/staff/StaffEmployeeChecklist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError, toastSuccess } from '@/lib/toast'
import { validateLeaveForm } from '@/lib/validation/branchForms'
import { apiClient } from '@/api/api'

// Create Leave wizard (2 steps) — opened from Staff Management header CTA.
export function LeaveFormDialog({
  open,
  onOpenChange,
  designations = [],
  staff = [],
  onSuccess,
}) {
  const [step, setStep] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [filterDesignation, setFilterDesignation] = useState('')
  const [mutating, setMutating] = useState(false)

  const resetForm = () => {
    setStep(1)
    setStartDate('')
    setEndDate('')
    setReason('')
    setSelectedEmployees([])
    setFilterDesignation('')
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  const dateError =
    startDate && endDate && new Date(startDate) > new Date(endDate)
      ? 'Start date cannot be after end date'
      : ''

  const dirty = Boolean(startDate || endDate || reason || selectedEmployees.length)

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

  const handleSave = async () => {
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
      onOpenChange?.(false)
      onSuccess?.()
    } else {
      toastError(res.error || 'Failed to submit leave request')
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title="Apply Leave"
      description="Register single or bulk employee leaves"
      contentClassName="sm:max-w-lg"
      footer={
        step === 1 ? (
          <>
            <DialogCancelButton disabled={mutating} />
            <Button type="button" onClick={handleNextStep} variant="brand">
              Next: Select Employees
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" disabled={mutating} onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1 size-4" />
              Back
            </Button>
            <Button type="button" disabled={mutating} onClick={handleSave} variant="brand">
              {mutating ? 'Saving…' : 'Apply & Save'}
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
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
            {dateError ? <p className="mt-1.5 text-xs font-medium text-red-500">{dateError}</p> : null}
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
        </div>
      ) : (
        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-800">
            <strong>Step 2:</strong> Select single or multiple employees.
          </div>
          <StaffEmployeeChecklist
            designations={designations}
            staff={staff}
            selectedIds={selectedEmployees}
            filterDesignation={filterDesignation}
            onFilterChange={setFilterDesignation}
            onToggle={handleCheckboxToggle}
            onSelectAllFiltered={handleSelectAllFiltered}
          />
        </div>
      )}
    </FormDialog>
  )
}

export default LeaveFormDialog
