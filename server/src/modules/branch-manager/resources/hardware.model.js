import { tenantQuery } from '../../../config/db.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'

const HARDWARE_TYPES = new Set(['Computers', 'Scanners', 'Printers', 'Telephone', 'Other'])
const HARDWARE_STATUSES = new Set(['New', 'Used', 'Good', 'Poor'])

const hardwareSelect = `
  h.id,
  h.code,
  h.name,
  h.company_name AS "companyName",
  h.type,
  h.status,
  h.image_url AS "imageUrl",
  h.created_at AS "createdAt",
  h.branch_id AS "branchId",
  u.full_name AS "assignedToName",
  s.id AS "assignedToStaffId"
`

function mapHardware(row) {
  if (!row) return null
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    companyName: row.companyName,
    type: row.type,
    status: row.status,
    image: normalizeImageUrl(row.imageUrl) || '',
    imageUrl: normalizeImageUrl(row.imageUrl) || '',
    createdAt: row.createdAt,
    branchId: row.branchId,
    assignedToName: row.assignedToName || null,
    assignedToStaffId: row.assignedToStaffId || null,
  }
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function formatSeqCode(prefix, n) {
  return `${prefix}-${String(n).padStart(3, '0')}`
}

async function nextHardwareCode(tenantId, branchId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT COALESCE(
        MAX(
          CASE
            WHEN code ~ '^HW-[0-9]+$'
            THEN NULLIF(regexp_replace(code, '^HW-', ''), '')::int
            ELSE 0
          END
        ),
        0
      ) + 1 AS next_n
      FROM branch_hardware
      WHERE tenant_id = $1
        AND branch_id = $2
    `,
    [branchId],
  )
  return formatSeqCode('HW', rows[0]?.next_n || 1)
}

export function assertHardwareType(type) {
  if (!type) {
    throw httpError(400, 'Select a device type')
  }
  if (!HARDWARE_TYPES.has(type)) {
    throw httpError(400, 'Invalid hardware type')
  }
}

export function assertHardwareStatus(status) {
  if (!HARDWARE_STATUSES.has(status)) {
    throw httpError(400, 'Invalid hardware status')
  }
}

export async function listHardware(tenantId, { branchId, type, q } = {}) {
  const search = q ? String(q).trim() : null
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${hardwareSelect}
      FROM branch_hardware h
      LEFT JOIN staff s
        ON s.tenant_id = h.tenant_id
       AND s.hardware_device_id = h.id::text
      LEFT JOIN users u
        ON u.id = s.user_id
       AND u.tenant_id = s.tenant_id
      WHERE h.tenant_id = $1
        AND ($2::uuid IS NULL OR h.branch_id = $2)
        AND ($3::text IS NULL OR h.type = $3)
        AND (
          $4::text IS NULL
          OR h.name ILIKE '%' || $4 || '%'
          OR h.code ILIKE '%' || $4 || '%'
          OR h.company_name ILIKE '%' || $4 || '%'
        )
      ORDER BY h.created_at DESC
    `,
    [branchId || null, type || null, search],
  )
  return rows.map(mapHardware)
}

export async function getHardwareById(tenantId, id, { branchId } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${hardwareSelect}
      FROM branch_hardware h
      LEFT JOIN staff s
        ON s.tenant_id = h.tenant_id
       AND s.hardware_device_id = h.id::text
      LEFT JOIN users u
        ON u.id = s.user_id
       AND u.tenant_id = s.tenant_id
      WHERE h.tenant_id = $1
        AND h.id = $2
        AND ($3::uuid IS NULL OR h.branch_id = $3)
      LIMIT 1
    `,
    [id, branchId || null],
  )
  return mapHardware(rows[0])
}

export async function createHardware(tenantId, payload) {
  const name = String(payload.name || '').trim()
  const companyName = String(payload.companyName || '').trim()
  const type = payload.type
  const status = payload.status
  const imageUrl = payload.image || payload.imageUrl || null
  const branchId = payload.branchId

  if (!branchId) throw httpError(400, 'branchId is required')
  if (!name) throw httpError(400, 'Hardware name is required')
  if (!companyName) throw httpError(400, 'Company name is required')
  assertHardwareType(type)
  assertHardwareStatus(status)

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = await nextHardwareCode(tenantId, branchId)
    try {
      const { rows } = await tenantQuery(
        tenantId,
        `
          INSERT INTO branch_hardware (
            tenant_id, branch_id, code, name, company_name, type, status, image_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `,
        [branchId, code, name, companyName, type, status, imageUrl || null],
      )
      return getHardwareById(tenantId, rows[0].id, { branchId })
    } catch (err) {
      if (err?.code === '23505' && attempt < 5) continue
      if (err?.code === '23505') {
        throw httpError(409, 'A hardware device with this ID already exists')
      }
      throw err
    }
  }

  throw httpError(500, 'Failed to allocate a unique hardware ID')
}

export async function updateHardware(tenantId, id, payload, { branchId } = {}) {
  const existing = await getHardwareById(tenantId, id, { branchId })
  if (!existing) return null

  const name = payload.name !== undefined ? String(payload.name || '').trim() : existing.name
  const companyName =
    payload.companyName !== undefined
      ? String(payload.companyName || '').trim()
      : existing.companyName
  const type = payload.type !== undefined ? payload.type : existing.type
  const status = payload.status !== undefined ? payload.status : existing.status
  const imageUrl =
    payload.image !== undefined || payload.imageUrl !== undefined
      ? payload.image || payload.imageUrl || null
      : existing.imageUrl || null

  if (!name) throw httpError(400, 'Hardware name is required')
  if (!companyName) throw httpError(400, 'Company name is required')
  assertHardwareType(type)
  assertHardwareStatus(status)

  await tenantQuery(
    tenantId,
    `
      UPDATE branch_hardware
      SET name = $2,
          company_name = $3,
          type = $4,
          status = $5,
          image_url = $6
      WHERE tenant_id = $1 AND id = $7
        AND ($8::uuid IS NULL OR branch_id = $8)
    `,
    [name, companyName, type, status, imageUrl, id, branchId || null],
  )

  return getHardwareById(tenantId, id, { branchId })
}

export async function deleteHardware(tenantId, id, { branchId } = {}) {
  const existing = await getHardwareById(tenantId, id, { branchId })
  if (!existing) return null

  if (existing.assignedToStaffId) {
    throw httpError(409, 'Cannot delete hardware. It is currently assigned to a staff member.')
  }

  const { rowCount } = await tenantQuery(
    tenantId,
    `
      DELETE FROM branch_hardware
      WHERE tenant_id = $1 AND id = $2
        AND ($3::uuid IS NULL OR branch_id = $3)
    `,
    [id, branchId || null],
  )
  return rowCount > 0 ? existing : null
}
