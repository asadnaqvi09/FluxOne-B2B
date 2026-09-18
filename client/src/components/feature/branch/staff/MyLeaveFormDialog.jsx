import { useEffect, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError, toastSuccess } from '@/lib/toast'
import { validateLeaveForm } from '@/lib/validation/branchForms'
import { apiClient } from '@/api/api'

// BM self-leave form — dates + reason only (no employee picker)
export function MyLeaveFormDialog({ open, onOpenChange, onSuccess }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [mutating, setMutating] = useState(false)

  const resetForm = () => {
    setStartDate('')
    setEndDate('')
    setReason('')
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  const dateError =
    startDate && endDate && new Date(startDate) > new Date(endDate)
      ? 'Start date cannot be after end date'
      : ''

  const dirty = Boolean(startDate || endDate || reason)

  const handleSave = async () => {
    const validationError = validateLeaveForm({ reason, startDate, endDate })
    if (validationError) return toastError(validationError)
    if (dateError) return

    setMutating(true)
    const res = await apiClient.post('/branch/leaves/me', {
      startDate,
      endDate,
      reason,
    })
    setMutating(false)

    if (res.success) {
      toastSuccess('Leave request submitted for Admin approval')
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
      title="Apply for Leave"
      description="Submit your personal leave request for Admin approval"
      contentClassName="sm:max-w-lg"
      footer={
        <>
          <DialogCancelButton disabled={mutating} />
          <Button type="button" disabled={mutating} onClick={handleSave} variant="brand">
            {mutating ? 'Submitting…' : 'Submit Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="my-leave-start">Start Date</Label>
            <Input
              id="my-leave-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="my-leave-end">End Date</Label>
            <Input
              id="my-leave-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
          </div>
        </div>
        {dateError ? <p className="text-xs font-medium text-red-500">{dateError}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="my-leave-reason">Reason / Note</Label>
          <Input
            id="my-leave-reason"
            placeholder="e.g. Sick Leave, Annual Leave"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>
    </FormDialog>
  )
}

export default MyLeaveFormDialog
