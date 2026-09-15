import {
  createLeave,
  listLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
} from './leaves.model.js'
import {
  upsertAttendance,
  clearAttendanceMarks,
} from '../attendance/attendance.model.js'
import { success, fail } from '../../../utils/response.util.js'

function toIsoDate(value) {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

function getDatesInRange(startDate, endDate) {
  const dates = []
  const start = toIsoDate(startDate)
  const end = toIsoDate(endDate)
  if (!start || !end) return dates
  let current = new Date(`${start}T12:00:00.000Z`)
  const last = new Date(`${end}T12:00:00.000Z`)
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0])
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export async function leavesList(req, res) {
  const designationId = req.query?.designationId || null
  const rows = await listLeaves(req.tenantId, { designationId })
  return success(res, rows)
}

export async function addLeave(req, res) {
  const { employeeIds, startDate, endDate, reason } = req.body

  if (!Array.isArray(employeeIds) || employeeIds.length === 0 || !startDate || !endDate) {
    return fail(res, 'Employees list, start date, and end date are required', 400)
  }

  try {
    const dates = getDatesInRange(startDate, endDate)

    for (const employeeId of employeeIds) {
      await createLeave(req.tenantId, {
        staffId: employeeId,
        startDate,
        endDate,
        reason,
        status: 'approved',
      })

      for (const date of dates) {
        await upsertAttendance(req.tenantId, {
          staffId: employeeId,
          workDate: date,
          status: 'leave',
          note: reason || 'Leave approved',
          createdBy: req.user.id,
        })
      }
    }

    return success(res, { message: 'Leave approved and attendance marked successfully' }, 201)
  } catch (err) {
    return fail(res, err.message || 'Failed to create leave', 500)
  }
}

export async function editLeave(req, res) {
  const { id } = req.params
  const { startDate, endDate, reason, status } = req.body

  try {
    const existing = await getLeaveById(req.tenantId, id)
    if (!existing) return fail(res, 'Leave not found', 404)

    const nextStart = startDate || existing.startDate
    const nextEnd = endDate || existing.endDate
    const nextReason = reason !== undefined ? reason : existing.reason
    const nextStatus = status || existing.status

    const oldDates = getDatesInRange(existing.startDate, existing.endDate)
    await clearAttendanceMarks(req.tenantId, {
      staffId: existing.staffId,
      dates: oldDates,
      status: 'leave',
    })

    const updated = await updateLeave(req.tenantId, id, {
      startDate: nextStart,
      endDate: nextEnd,
      reason: nextReason,
      status: nextStatus,
    })

    if (nextStatus !== 'cancelled' && nextStatus !== 'rejected') {
      const newDates = getDatesInRange(nextStart, nextEnd)
      for (const date of newDates) {
        await upsertAttendance(req.tenantId, {
          staffId: existing.staffId,
          workDate: date,
          status: 'leave',
          note: nextReason || 'Leave approved',
          createdBy: req.user.id,
        })
      }
    }

    return success(res, updated)
  } catch (err) {
    return fail(res, err.message || 'Failed to update leave', 500)
  }
}

export async function removeLeave(req, res) {
  const { id } = req.params

  try {
    const existing = await getLeaveById(req.tenantId, id)
    if (!existing) return fail(res, 'Leave not found', 404)

    const dates = getDatesInRange(existing.startDate, existing.endDate)
    await clearAttendanceMarks(req.tenantId, {
      staffId: existing.staffId,
      dates,
      status: 'leave',
    })

    const deleted = await deleteLeave(req.tenantId, id)
    return success(res, deleted)
  } catch (err) {
    return fail(res, err.message || 'Failed to delete leave', 500)
  }
}
