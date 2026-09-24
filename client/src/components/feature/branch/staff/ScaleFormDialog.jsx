import { useEffect, useMemo, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { FieldError } from '@/components/shared/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseScaleMaxPoints, sumScalePoints } from '@/lib/performanceScales'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { toastError, toastSuccess } from '@/lib/toast'
import { apiClient } from '@/api/api'
import { Checkbox } from '@/components/ui/checkbox'

const EMPTY = { name: '', maxPoints: '', isActive: true }

const FIELD_IDS = {
  name: 'scale-name',
  maxPoints: 'scale-points',
}

const SCALE_FIELD_ORDER = ['name', 'maxPoints']

// Add / Edit scoring factor — dynamic max points, no fixed 100 budget.
export function ScaleFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialScale = null,
  scales = [],
  onSuccess,
}) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(EMPTY)
  const [mutating, setMutating] = useState(false)
  const [touchedPoints, setTouchedPoints] = useState(false)
  const { fieldErrors, formError, resetErrors, clearField, applyErrors } = useFieldErrors()

  const excludeId = isEdit ? initialScale?.id : null

  // Other factors already allocated (excludes the row being edited).
  const otherUsed = useMemo(() => sumScalePoints(scales, excludeId), [scales, excludeId])

  useEffect(() => {
    if (!open) {
      setForm(EMPTY)
      setTouchedPoints(false)
      return
    }
    resetErrors()
    setTouchedPoints(false)
    if (isEdit && initialScale) {
      setForm({
        name: initialScale.name || '',
        maxPoints: String(initialScale.maxPoints ?? ''),
        isActive: initialScale.isActive !== false,
      })
    } else {
      setForm({ name: '', maxPoints: '', isActive: true })
    }
  }, [open, isEdit, initialScale, resetErrors])

  const parsed = parseScaleMaxPoints(form.maxPoints)
  const pointsValue = parsed.ok ? parsed.value : null
  const rangeError =
    form.maxPoints !== '' && !parsed.ok
      ? parsed.error
      : touchedPoints && form.maxPoints === ''
        ? parsed.error
        : null

  const pointsHint = fieldErrors.maxPoints || rangeError

  // Live total max points reference for the Branch Manager.
  const projectedTotal = pointsValue == null ? otherUsed : otherUsed + pointsValue
  const canSubmit = Boolean(form.name.trim()) && parsed.ok && !mutating

  const dirty =
    isEdit && initialScale
      ? form.name !== (initialScale.name || '') ||
        String(form.maxPoints) !== String(initialScale.maxPoints ?? '') ||
        Boolean(form.isActive) !== (initialScale.isActive !== false)
      : Boolean(form.name || form.maxPoints)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouchedPoints(true)

    const errors = {}
    const name = form.name.trim()
    if (!name) errors.name = 'Criteria name is required'

    const check = parseScaleMaxPoints(form.maxPoints)
    if (!check.ok) errors.maxPoints = check.error

    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, SCALE_FIELD_ORDER)
      return
    }

    resetErrors()
    setMutating(true)
    try {
      const payload = {
        name,
        maxPoints: check.value,
        isActive: Boolean(form.isActive),
      }
      const res = isEdit
        ? await apiClient.put(`/branch/performance/scales/${initialScale.id}`, payload)
        : await apiClient.post('/branch/performance/scales', payload)

      if (res.success) {
        toastSuccess(isEdit ? 'Scoring scale updated' : 'Scoring scale added')
        onOpenChange?.(false)
        onSuccess?.()
      } else {
        toastError(res.error || (isEdit ? 'Failed to update scale' : 'Failed to add scale'))
      }
    } catch (err) {
      toastError(err?.message || (isEdit ? 'Failed to update scale' : 'Failed to add scale'))
    } finally {
      setMutating(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title={isEdit ? 'Edit Scoring Scale' : 'Add Scoring Scale'}
      description="Assign any maximum points per factor. Final employee scores are always normalized to 100%."
      contentClassName="sm:max-w-md"
      footer={
        <>
          <DialogCancelButton disabled={mutating} />
          <Button type="submit" form="scale-form" disabled={!canSubmit} variant="brand">
            {mutating ? 'Saving…' : isEdit ? 'Update Scale' : 'Add Scale'}
          </Button>
        </>
      }
    >
      {formError ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      <form id="scale-form" className="space-y-4 py-1" onSubmit={handleSubmit} noValidate>
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            pointsHint
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          Total maximum points: <strong>{projectedTotal}</strong>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-name">Criteria Name</Label>
          <Input
            id="scale-name"
            placeholder="e.g. Punctuality, Teamwork"
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }))
              clearField('name')
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            className={fieldErrorClass(fieldErrors.name)}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-points">Maximum Score Points</Label>
          <Input
            id="scale-points"
            type="number"
            min={1}
            step={1}
            placeholder="e.g. 50"
            value={form.maxPoints}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, maxPoints: e.target.value }))
              clearField('maxPoints')
            }}
            onBlur={() => setTouchedPoints(true)}
            aria-invalid={Boolean(fieldErrors.maxPoints || rangeError)}
            className={fieldErrorClass(fieldErrors.maxPoints || rangeError)}
          />
          <FieldError message={fieldErrors.maxPoints || (touchedPoints ? rangeError : null)} />
        </div>

        <label
          htmlFor="scale-active"
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
        >
          <Checkbox
            id="scale-active"
            checked={Boolean(form.isActive)}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            className="mt-0.5"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">Enable factor</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Disabled factors are excluded from employee evaluation and final % calculation.
            </span>
          </span>
        </label>
      </form>
    </FormDialog>
  )
}

export default ScaleFormDialog
