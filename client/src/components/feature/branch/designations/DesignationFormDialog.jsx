import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { toastSuccess } from '@/lib/toast'

const EMPTY_FORM = {
  name: '',
}

export function DesignationFormDialog({
  open,
  onOpenChange,
  onSubmitSuccess,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(EMPTY_FORM)
    captureBaseline(EMPTY_FORM)
  }, [open])

  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    const name = String(form.name || '').trim()
    if (!name) {
      setError('Designation name is required')
      return
    }

    setLoading(true)
    const res = await apiClient.post(endpoints.branch.designations.create, { name })
    setLoading(false)

    if (res.success) {
      toastSuccess('Designation created')
      onSubmitSuccess?.(res.data)
      onOpenChange?.(false)
    } else {
      setError(res.error || 'Failed to create designation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(form)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Designation</DialogTitle>
          <DialogDescription>
            Create a new custom designation title for your branch team roster.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="designation-name">Designation Name</Label>
            <Input
              id="designation-name"
              placeholder="e.g. Floor Manager, Lead Cashier"
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogCancelButton
              disabled={loading}
              className="w-full sm:w-auto"
            />
            <Button
              type="submit"
              disabled={loading}
              variant="brand"
              className="w-full sm:w-auto"
            >
              {loading ? 'Saving…' : 'Create Designation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DesignationFormDialog
