import {
  createHolidaySchedule,
  listHolidaySchedules,
  getHolidayScheduleById,
  updateHolidaySchedule,
  deleteHolidaySchedule,
} from './holidays.model.js'
import {
  upsertAttendance,
  clearHolidayAttendanceByDate,
} from '../attendance/attendance.model.js'
import { tenantQuery } from '../../../config/db.js'
import { success, fail, failFromError } from '../../../utils/response.util.js'

function getDatesInRange(startDate, endDate) {
  const dates = []
  if (!startDate) return dates
  const current = new Date(startDate)
  const last = new Date(endDate || startDate)
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

async function syncScheduleAttendance(tenantId, userId, schedule, employeeIds) {
  const dates = getDatesInRange(schedule.startDate, schedule.endDate)

  if (schedule.status === 'inactive') {
    // Clear attendance marks if inactive
    for (const date of dates) {
      await clearHolidayAttendanceByDate(tenantId, {
        workDate: date,
        note: schedule.name,
      })
    }
    return
  }

  let targetStaffIds = employeeIds || []
  if (schedule.isAllEmployees) {
    const { rows: allStaff } = await tenantQuery(
      tenantId,
      `
        SELECT s.id
        FROM staff s
        JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1
          AND s.status = 'active'
          AND u.is_active = true
          AND ($2::uuid IS NULL OR s.branch_id = $2)
      `,
      [schedule.branchId || null],
    )
    targetStaffIds = allStaff.map((s) => s.id)
  }

  for (const staffId of targetStaffIds) {
    for (const date of dates) {
      await upsertAttendance(tenantId, {
        staffId,
        workDate: date,
        status: 'holiday',
        note: schedule.name,
        createdBy: userId,
      })
    }
  }
}

export async function holidaysList(req, res) {
  const rows = await listHolidaySchedules(req.tenantId, { branchId: req.user?.branchId || null })
  return success(res, rows)
}

export async function addHoliday(req, res) {
  const {
    name,
    startDate,
    endDate,
    isAllEmployees = true,
    employeeIds = [],
    status = 'active',
  } = req.validated.body

  try {
    const schedule = await createHolidaySchedule(req.tenantId, {
      name: name.trim(),
      startDate,
      endDate: endDate || startDate,
      isAllEmployees: Boolean(isAllEmployees),
      employeeIds: Array.isArray(employeeIds) ? employeeIds : [],
      status: status || 'active',
      branchId: req.user?.branchId || null,
    })

    await syncScheduleAttendance(
      req.tenantId,
      req.user.id,
      schedule,
      employeeIds,
    )

    return success(res, schedule, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create holiday schedule')
  }
}

export async function editHoliday(req, res) {
  const { id } = req.validated.params
  const {
    name,
    startDate,
    endDate,
    holidayDate,
    isAllEmployees,
    employeeIds,
    status,
  } = req.validated.body

  try {
    const existing = await getHolidayScheduleById(req.tenantId, id)
    if (!existing) return fail(res, 'Holiday schedule not found', 404)

    // Clear previous dates attendance if dates or name changed
    const oldDates = getDatesInRange(existing.startDate, existing.endDate)
    for (const date of oldDates) {
      await clearHolidayAttendanceByDate(req.tenantId, {
        workDate: date,
        note: existing.name,
      })
    }

    const updated = await updateHolidaySchedule(req.tenantId, id, {
      name: name?.trim(),
      startDate: startDate || holidayDate || existing.startDate,
      endDate: endDate || startDate || holidayDate || existing.endDate,
      isAllEmployees,
      employeeIds,
      status,
      branchId: req.user?.branchId || null,
    })

    if (!updated) return fail(res, 'Failed to update holiday schedule', 500)

    // Re-apply attendance for new configuration
    await syncScheduleAttendance(
      req.tenantId,
      req.user.id,
      updated,
      updated.employeeIds,
    )

    return success(res, updated)
  } catch (err) {
    return failFromError(res, err, 'Failed to update holiday schedule')
  }
}

export async function removeHoliday(req, res) {
  const { id } = req.validated.params

  try {
    const existing = await getHolidayScheduleById(req.tenantId, id)
    if (!existing) return fail(res, 'Holiday schedule not found', 404)

    const dates = getDatesInRange(existing.startDate, existing.endDate)
    for (const date of dates) {
      await clearHolidayAttendanceByDate(req.tenantId, {
        workDate: date,
        note: existing.name,
      })
    }

    const deleted = await deleteHolidaySchedule(req.tenantId, id)
    return success(res, deleted)
  } catch (err) {
    return failFromError(res, err, 'Failed to delete holiday schedule')
  }
}
