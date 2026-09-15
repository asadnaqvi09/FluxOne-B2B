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
import { NativeSelect } from '@/components/ui/select'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { BRAND } from '@/lib/constants'
import {
  getBranchHoursSoftWarning,
  validateStaffForm,
} from '@/lib/validation/staffSchedule'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const EMPTY_FORM = {
  email: '',
  password: '',
  fullName: '',
  role: 'inventory_manager',
  hardwareDeviceId: '',
  scheduleStart: '',
  scheduleBreakStart: '',
  scheduleBreakEnd: '',
  scheduleEnd: '',
  image: null,
}

const STAFF_ROLES = [
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'website_manager', label: 'Website Manager' },
  { value: 'production_staff', label: 'Production Staff' },
  { value: 'delivery_staff', label: 'Delivery Staff' },
]

function timeInputValue(value) {
  if (!value) return ''
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

function resolveRole(initialStaff) {
  const allowed = STAFF_ROLES.map((r) => r.value)
  if (allowed.includes(initialStaff?.role)) return initialStaff.role
  const designation = String(initialStaff?.designation || '').toLowerCase()
  if (designation.includes('website')) return 'website_manager'
  if (designation.includes('delivery')) return 'delivery_staff'
  if (designation.includes('production')) return 'production_staff'
  if (designation.includes('cashier')) return 'cashier'
  return 'inventory_manager'
}

// Add / Edit staff modal for Branch Manager.
// Does not send branchId — server scopes from JWT.
// System role drives designation automatically (no custom designation picker).
export function StaffFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialStaff = null,
  onSubmit,
  loading = false,
}) {
  const isEdit = mode === 'edit'
  const [branchHours, setBranchHours] = useState({ openingTime: '', closingTime: '' })
  const hoursWarning = getBranchHoursSoftWarning(branchHours)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [hardwareOptions, setHardwareOptions] = useState([])
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    setError(null)

    async function loadBranchHours() {
      const res = await apiClient.get(endpoints.auth.me)
      if (res.success && res.data) {
        setBranchHours({
          openingTime: timeInputValue(res.data.openingTime),
          closingTime: timeInputValue(res.data.closingTime),
        })
      } else {
        setBranchHours({ openingTime: '', closingTime: '' })
      }
    }

    async function loadHardwareOptions() {
      const res = await apiClient.get(endpoints.branch.resources.hardware.list)
      if (res.success) {
        setHardwareOptions(res.data || [])
      } else {
        setHardwareOptions([])
      }
    }

    void loadBranchHours()
    void loadHardwareOptions()

    if (isEdit && initialStaff) {
      const nextForm = {
        email: initialStaff.email || '',
        password: '',
        fullName: initialStaff.fullName || '',
        role: resolveRole(initialStaff),
        hardwareDeviceId: initialStaff.hardwareDeviceId || '',
        scheduleStart: timeInputValue(initialStaff.scheduleStart),
        scheduleBreakStart: timeInputValue(initialStaff.scheduleBreakStart),
        scheduleBreakEnd: timeInputValue(initialStaff.scheduleBreakEnd),
        scheduleEnd: timeInputValue(initialStaff.scheduleEnd),
        image: null,
      }
      setForm(nextForm)
      captureBaseline(nextForm)
    } else {
      setForm(EMPTY_FORM)
      captureBaseline(EMPTY_FORM)
    }
  }, [open, isEdit, initialStaff])

  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    let hours = branchHours
    const meRes = await apiClient.get(endpoints.auth.me)
    if (meRes.success && meRes.data) {
      hours = {
        openingTime: timeInputValue(meRes.data.openingTime),
        closingTime: timeInputValue(meRes.data.closingTime),
      }
      setBranchHours(hours)
    }

    const validationError = validateStaffForm(form, { isEdit, branchHours: hours })
    if (validationError) {
      setError(validationError)
      return
    }

    const result = await onSubmit?.(form)
    if (result && result.success === false) {
      setError(result.error || 'Save failed')
      return
    }
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(form)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update branch staff details. Leave password blank to keep the current one.'
              : 'Create branch staff for this location only (Inventory Manager, Cashier, Website Manager, and more).'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-email">ID (login)</Label>
              <Input
                id="staff-email"
                autoComplete="off"
                placeholder="e.g. im.wah01"
                value={form.email}
                onChange={(e) => patch('email', e.target.value)}
              />
              <p className="text-xs text-slate-500">Used with password at login (maps to API email).</p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-password">
                Password {isEdit ? <span className="font-normal text-slate-400">(optional)</span> : null}
              </Label>
              <Input
                id="staff-password"
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 8 characters'}
                value={form.password}
                onChange={(e) => patch('password', e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={form.fullName}
                placeholder="Full name"
                onChange={(e) => patch('fullName', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-role">System Role</Label>
              <NativeSelect
                id="staff-role"
                value={form.role}
                onChange={(e) => patch('role', e.target.value)}
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-hardware">Hardware</Label>
              <NativeSelect
                id="staff-hardware"
                value={form.hardwareDeviceId || ''}
                onChange={(e) => patch('hardwareDeviceId', e.target.value)}
              >
                <option value="">No hardware assigned</option>
                {hardwareOptions
                  .filter((hw) => {
                    const assignedToOther =
                      hw.assignedToStaffId &&
                      hw.assignedToStaffId !== initialStaff?.id
                    return !assignedToOther || hw.id === form.hardwareDeviceId
                  })
                  .map((hw) => (
                    <option key={hw.id} value={hw.id}>
                      {hw.name}
                      {hw.code ? ` (${hw.code})` : ''}
                      {hw.type ? ` · ${hw.type}` : ''}
                    </option>
                  ))}
              </NativeSelect>
              {hardwareOptions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hardware registered yet. Add devices under Resources.
                </p>
              ) : null}
            </div>

            {hoursWarning ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100 sm:col-span-2">
                {hoursWarning}
              </p>
            ) : branchHours.openingTime && branchHours.closingTime ? (
              <p className="text-xs text-slate-500 sm:col-span-2">
                Branch hours: {branchHours.openingTime}–{branchHours.closingTime}. Shift must fall
                inside this window.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="staff-start">Start Time</Label>
              <Input
                id="staff-start"
                type="time"
                value={form.scheduleStart}
                onChange={(e) => patch('scheduleStart', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-break-start">Break from</Label>
              <Input
                id="staff-break-start"
                type="time"
                value={form.scheduleBreakStart}
                onChange={(e) => patch('scheduleBreakStart', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-break-end">Break to</Label>
              <Input
                id="staff-break-end"
                type="time"
                value={form.scheduleBreakEnd}
                onChange={(e) => patch('scheduleBreakEnd', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-end">End Time</Label>
              <Input
                id="staff-end"
                type="time"
                value={form.scheduleEnd}
                onChange={(e) => patch('scheduleEnd', e.target.value)}
              />
            </div>

            <ImageUploadField
              id="staff-image"
              label="Photo"
              optionalLabel="(optional)"
              value={form.image}
              existingImageUrl={isEdit ? initialStaff?.imageUrl : null}
              onChange={(file) => patch('image', file)}
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
              style={{ background: BRAND.purple }}
              className="w-full text-white hover:opacity-90 sm:w-auto"
            >
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
