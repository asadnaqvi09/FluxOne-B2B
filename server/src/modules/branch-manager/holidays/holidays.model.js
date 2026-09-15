import { tenantQuery } from '../../../config/db.js'

export async function createHoliday(tenantId, { name, date }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      INSERT INTO holidays (tenant_id, holiday_date, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id, holiday_date) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, holiday_date AS "holidayDate", name
    `,
    [date, name.trim()],
  )
  return rows[0]
}

export async function listHolidays(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, holiday_date AS "holidayDate", name
      FROM holidays
      WHERE tenant_id = $1
      ORDER BY holiday_date DESC
    `,
  )
  return rows
}

export async function getHolidayById(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, holiday_date AS "holidayDate", name
      FROM holidays
      WHERE tenant_id = $1 AND id = $2
      LIMIT 1
    `,
    [id],
  )
  return rows[0] || null
}

export async function updateHoliday(tenantId, id, { name, holidayDate }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE holidays
      SET
        name = COALESCE($2, name),
        holiday_date = COALESCE($3::date, holiday_date)
      WHERE tenant_id = $1 AND id = $4
      RETURNING id, holiday_date AS "holidayDate", name
    `,
    [name?.trim() || null, holidayDate || null, id],
  )
  return rows[0] || null
}

export async function deleteHoliday(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      DELETE FROM holidays
      WHERE tenant_id = $1 AND id = $2
      RETURNING id, holiday_date AS "holidayDate", name
    `,
    [id],
  )
  return rows[0] || null
}
