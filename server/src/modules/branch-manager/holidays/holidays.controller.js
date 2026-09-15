import {
  createHoliday,
  listHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
} from './holidays.model.js'
import {
  upsertAttendance,
  clearHolidayAttendanceByDate,
} from '../attendance/attendance.model.js'
import { tenantQuery } from '../../../config/db.js'
import { success, fail } from '../../../utils/response.util.js'

function getDatesInRange(startDate, endDate) {
  const dates = []
  let current = new Date(startDate)
  const last = new Date(endDate)
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export async function holidaysList(req, res) {
  const rows = await listHolidays(req.tenantId)
  return success(res, rows)
}

export async function addHoliday(req, res) {
  const { name, startDate, endDate, employeeIds } = req.body

  if (!name || !startDate || !endDate) {
    return fail(res, 'Holiday name, start date, and end date are required', 400)
  }

  try {
    const dates = getDatesInRange(startDate, endDate)

    for (const date of dates) {
      await createHoliday(req.tenantId, { name, date })
    }

    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      for (const employeeId of employeeIds) {
        for (const date of dates) {
          await upsertAttendance(req.tenantId, {
            staffId: employeeId,
            workDate: date,
            status: 'holiday',
            note: name,
            createdBy: req.user.id,
          })
        }
      }
    }

    return success(res, { message: 'Holiday created and applied to selected employees successfully' }, 201)
  } catch (err) {
    return fail(res, err.message || 'Failed to create holiday', 500)
  }
}

export async function editHoliday(req, res) {
  const { id } = req.params
  const { name, holidayDate } = req.body

  if (!name && !holidayDate) {
    return fail(res, 'Provide a name and/or holiday date to update', 400)
  }

  try {
    const existing = await getHolidayById(req.tenantId, id)
    if (!existing) return fail(res, 'Holiday not found', 404)

    const updated = await updateHoliday(req.tenantId, id, { name, holidayDate })
    if (!updated) return fail(res, 'Failed to update holiday', 500)

    // Keep attendance notes in sync when renaming same-date holiday marks
    if (name && name.trim() !== existing.name) {
      const dateStr =
        typeof existing.holidayDate === 'string'
          ? existing.holidayDate.slice(0, 10)
          : new Date(existing.holidayDate).toISOString().slice(0, 10)
      await tenantQuery(
        req.tenantId,
        `
          UPDATE attendance
          SET note = $2
          WHERE tenant_id = $1
            AND work_date = $3::date
            AND status = 'holiday'
            AND note = $4
        `,
        [name.trim(), dateStr, existing.name],
      )
    }

    return success(res, updated)
  } catch (err) {
    return fail(res, err.message || 'Failed to update holiday', 500)
  }
}

export async function removeHoliday(req, res) {
  const { id } = req.params

  try {
    const existing = await getHolidayById(req.tenantId, id)
    if (!existing) return fail(res, 'Holiday not found', 404)

    const dateStr =
      typeof existing.holidayDate === 'string'
        ? existing.holidayDate.slice(0, 10)
        : new Date(existing.holidayDate).toISOString().slice(0, 10)

    await clearHolidayAttendanceByDate(req.tenantId, {
      workDate: dateStr,
      note: existing.name,
    })

    const deleted = await deleteHoliday(req.tenantId, id)
    return success(res, deleted)
  } catch (err) {
    return fail(res, err.message || 'Failed to delete holiday', 500)
  }
}
