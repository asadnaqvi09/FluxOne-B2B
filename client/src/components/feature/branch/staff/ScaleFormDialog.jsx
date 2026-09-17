import { useEffect, useMemo, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SCALE_POINTS_BUDGET,
  parseScaleMaxPoints,
  sumScalePoints,
  validateScaleTotal,
} from '@/lib/performanceScales'
import { toastError, toastSuccess } from '@/lib/toast'
import { apiClient } from '@/api/api'

const EMPTY = { name: '', maxPoints: '' }

// Add / Edit scoring scale — per-criterion 0–100 and combined total ≤ 100.
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

  const excludeId = isEdit ? initialScale?.id : null

  // Other criteria already allocated (excludes the row being edited).
  const otherUsed = useMemo(() => sumScalePoints(scales, excludeId), [scales, excludeId])

  useEffect(() => {
    if (!open) {
      setForm(EMPTY)
      setTouchedPoints(false)
      return
    }
    setTouchedPoints(false)
    if (isEdit && initialScale) {
      setForm({
        name: initialScale.name || '',
        maxPoints: String(initialScale.maxPoints ?? ''),
      })
    } else {
      const remaining = Math.max(0, SCALE_POINTS_BUDGET - otherUsed)
      setForm({
        name: '',
        maxPoints: remaining > 0 ? String(Math.min(25, remaining)) : '',
      })
    }
  }, [open, isEdit, initialScale, otherUsed])

  const parsed = parseScaleMaxPoints(form.maxPoints)
  const pointsValue = parsed.ok ? parsed.value : null
  const rangeError =
    form.maxPoints !== '' && !parsed.ok ? parsed.error : touchedPoints && form.maxPoints === '' ? parsed.error : null

  const totalCheck =
    pointsValue == null
      ? { ok: true, used: otherUsed, projected: otherUsed, error: null }
      : validateScaleTotal(scales, pointsValue, excludeId)

  const overBudget = Boolean(totalCheck.error)
  const projectedTotal = pointsValue == null ? otherUsed : totalCheck.projected
  const canSubmit =
    Boolean(form.name.trim()) && parsed.ok && totalCheck.ok && !mutating && !( !isEdit && otherUsed >= SCALE_POINTS_BUDGET )

  const dirty =
    isEdit && initialScale
      ? form.name !== (initialScale.name || '') ||
        String(form.maxPoints) !== String(initialScale.maxPoints ?? '')
      : Boolean(form.name || form.maxPoints)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouchedPoints(true)

    const name = form.name.trim()
    if (!name) return toastError('Criteria name is required')

    const check = parseScaleMaxPoints(form.maxPoints)
    if (!check.ok) return toastError(check.error)

    const budget = validateScaleTotal(scales, check.value, excludeId)
    if (!budget.ok) return toastError(budget.error)

    setMutating(true)
    const payload = { name, maxPoints: check.value }
    const res = isEdit
      ? await apiClient.put(`/branch/performance/scales/${initialScale.id}`, payload)
      : await apiClient.post('/branch/performance/scales', payload)
    setMutating(false)

    if (res.success) {
      toastSuccess(isEdit ? 'Scoring scale updated' : 'Scoring scale added')
      onOpenChange?.(false)
      onSuccess?.()
    } else {
      toastError(res.error || (isEdit ? 'Failed to update scale' : 'Failed to add scale'))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title={isEdit ? 'Edit Scoring Scale' : 'Add Scoring Scale'}
      description="Each criterion is scored 0–100. Combined maximum across all criteria cannot exceed 100."
      contentClassName="sm:max-w-md"
      footer={
        <>
          <DialogCancelButton disabled={mutating} />
          <Button
            type="submit"
            form="scale-form"
            disabled={!canSubmit}
            variant="brand"
          >
            {mutating ? 'Saving…' : isEdit ? 'Update Scale' : 'Add Scale'}
          </Button>
        </>
      }
    >
      <form id="scale-form" className="space-y-4 py-1" onSubmit={handleSubmit}>
        {/* Real-time projected total including the value being typed */}
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            overBudget || rangeError
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : projectedTotal === SCALE_POINTS_BUDGET
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          Total Score:{' '}
          <strong>
            {projectedTotal} / {SCALE_POINTS_BUDGET}
          </strong>
          {overBudget ? (
            <p className="mt-1 font-medium">{totalCheck.error}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-name">Criteria Name</Label>
          <Input
            id="scale-name"
            placeholder="e.g. Communication points"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-points">Maximum Score Points</Label>
          <Input
            id="scale-points"
            type="number"
            min={0}
            max={100}
            step={1}
            placeholder="0 – 100"
            value={form.maxPoints}
            onChange={(e) => setForm((prev) => ({ ...prev, maxPoints: e.target.value }))}
            onBlur={() => setTouchedPoints(true)}
            className={rangeError || overBudget ? 'border-red-500 focus-visible:ring-red-500' : ''}
            required
          />
          {rangeError ? <p className="text-xs font-medium text-rose-600">{rangeError}</p> : null}
          {!rangeError && overBudget ? (
            <p className="text-xs font-medium text-rose-600">{totalCheck.error}</p>
          ) : null}
        </div>
      </form>
    </FormDialog>
  )
}

export default ScaleFormDialog
