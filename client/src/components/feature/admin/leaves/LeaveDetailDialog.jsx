import { useEffect, useMemo, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { referenceFromUuid, displayStaffRef } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

// Decision options for pending leave (UI labels → API status values)
const DECISION_OPTIONS = [
  { value: 'pending', label: 'Initial Pending' },
  { value: 'approved', label: 'Accept' },
  { value: 'rejected', label: 'Reject' },
]

function displayLeaveRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'LV') : '—'
}

function displayLeaveStaffRef(row = {}) {
  return displayStaffRef({ id: row.requestedBy || row.staffId })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function resolveDayCount(row = {}) {
  if (row.dayCount != null) return Number(row.dayCount) || 0
  if (!row.startDate || !row.endDate) return 0
  const a = new Date(row.startDate)
  const b = new Date(row.endDate)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.round((b - a) / 86400000) + 1
}

function dayLabel(count) {
  const n = Number(count) || 0
  return `${n} ${n === 1 ? 'Day' : 'Days'}`
}

function statusBadgeClass(status) {
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-28 shrink-0 text-xs text-slate-500 sm:pt-0.5">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-slate-800">{children}</div>
    </div>
  )
}

// use reusable components if possible — FormDialog (dirty / discard / no outside close)
// mode="admin" → decide pending leaves · mode="self" → BM read-only details (Image 1 pattern)
export function LeaveDetailDialog({
  open,
  onOpenChange,
  row,
  mode = 'admin',
  // presetDecision: 'approved' | 'rejected' | null — from table Approve / Reject icons
  presetDecision = null,
  submitting = false,
  onConfirm,
}) {
  const isSelf = mode === 'self'
  const isPending = !isSelf && row?.status === 'pending'
  const [decisionStatus, setDecisionStatus] = useState('pending')
  const [decisionReason, setDecisionReason] = useState('')
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open || !row) return
    const nextStatus = isPending && presetDecision ? presetDecision : 'pending'
    setDecisionStatus(nextStatus)
    setDecisionReason('')
    // Baseline always starts as Initial Pending + empty reason so Accept/Reject presets count as dirty
    captureBaseline({ status: 'pending', reason: '' })
  }, [open, row, presetDecision, isPending, captureBaseline])

  const formSnapshot = useMemo(
    () => ({ status: decisionStatus, reason: decisionReason }),
    [decisionStatus, decisionReason],
  )
  const dirty = isPending ? isDirty(formSnapshot) : false

  const showReasonBox = isPending && decisionStatus !== 'pending'
  const reasonRequired = decisionStatus === 'rejected'

  const confirmDisabled =
    submitting ||
    decisionStatus === 'pending' ||
    (decisionStatus === 'rejected' && !decisionReason.trim())

  const handleConfirm = () => {
    if (!isPending || decisionStatus === 'pending') return
    onConfirm?.({
      status: decisionStatus,
      decisionReason: decisionReason.trim(),
    })
  }

  const days = resolveDayCount(row || {})

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title={`Leave Details — ${displayLeaveRef(row || {})}`}
      description={
        isSelf
          ? 'Review your leave request and Admin decision comments.'
          : 'Branch manager personal leave request'
      }
      footer={
        isPending ? (
          <>
            {/* Cancel / X use Dialog discard flow when dirty */}
            <DialogCancelButton>Cancel</DialogCancelButton>
            <Button
              type="button"
              variant="brand"
              disabled={confirmDisabled}
              onClick={handleConfirm}
              className={
                decisionStatus === 'rejected'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : undefined
              }
            >
              {submitting ? 'Saving…' : 'Confirm'}
            </Button>
          </>
        ) : (
          <Button type="button" variant="brand" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        )
      }
    >
      {row ? (
        <div className="space-y-4 py-1">
          <div className="space-y-3 rounded-xl border border-border bg-slate-50/60 p-3 sm:p-4">
            {isSelf ? (
              <>
                <DetailRow label="Reason">{row.reason || '—'}</DetailRow>
                <DetailRow label="Dates">
                  {formatRange(row.startDate, row.endDate)}
                  {days > 0 ? ` (${dayLabel(days)})` : ''}
                </DetailRow>
                <DetailRow label="Applied">{formatDateTime(row.createdAt)}</DetailRow>
                <DetailRow label="Status">
                  <Badge className={cn('border capitalize', statusBadgeClass(row.status))}>
                    {row.status}
                  </Badge>
                </DetailRow>
                {row.decidedAt ? (
                  <DetailRow label="Decided">{formatDateTime(row.decidedAt)}</DetailRow>
                ) : null}
                <DetailRow label="Admin note">{row.decisionReason || '—'}</DetailRow>
              </>
            ) : (
              <>
                <DetailRow label="Employee">
                  <strong>{row.managerName || 'Branch Manager'}</strong>
                  <span className="text-slate-500"> ({displayLeaveStaffRef(row)})</span>
                </DetailRow>
                <DetailRow label="Branch">
                  {row.branchName || '—'}
                  {row.branchLocation ? ` / ${row.branchLocation}` : ''}
                </DetailRow>
                <DetailRow label="Dates">
                  {formatRange(row.startDate, row.endDate)} ({dayLabel(days)})
                </DetailRow>
                <DetailRow label="Applied">{formatDateTime(row.createdAt)}</DetailRow>
                <DetailRow label="Reason">{row.reason || '—'}</DetailRow>

                <DetailRow label="Status">
                  {isPending ? (
                    // Pending → editable decision dropdown
                    <NativeSelect
                      value={decisionStatus}
                      onChange={(e) => setDecisionStatus(e.target.value)}
                      className="max-w-xs"
                      aria-label="Leave decision status"
                    >
                      {DECISION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Badge className={cn('border capitalize', statusBadgeClass(row.status))}>
                      {row.status}
                    </Badge>
                  )}
                </DetailRow>

                {!isPending && row.decisionReason ? (
                  <DetailRow label="Admin note">{row.decisionReason}</DetailRow>
                ) : null}
              </>
            )}
          </div>

          {/* Accept → optional note · Reject → required rejection reason */}
          {showReasonBox ? (
            <div className="space-y-2">
              <Label htmlFor="leave-decision-reason">
                {reasonRequired ? 'Rejection reason *' : 'Note (optional)'}
              </Label>
              <Textarea
                id="leave-decision-reason"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={
                  reasonRequired
                    ? 'Explain why this leave is rejected'
                    : 'Optional note for the branch manager'
                }
                className="min-h-24"
              />
              {reasonRequired ? (
                <p className="text-[11px] text-slate-500">
                  A rejection reason is required before you can confirm.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </FormDialog>
  )
}

export default LeaveDetailDialog
