import { tenantQuery } from '../../../config/db.js'

function httpError(status, message, extra = {}) {
  const error = new Error(message)
  error.status = status
  Object.assign(error, extra)
  return error
}

function mapPgUniqueViolation(err, message) {
  if (err?.code === '23505') {
    throw httpError(409, message)
  }
  throw err
}

const typeSelect = `
  vt.id,
  vt.name,
  vt.is_active AS "isActive",
  vt.created_at AS "createdAt",
  vt.updated_at AS "updatedAt",
  (
    SELECT count(*)::int
    FROM variant_values vv
    WHERE vv.tenant_id = vt.tenant_id
      AND vv.variant_type_id = vt.id
  ) AS "valuesCount"
`

function activeSqlClause(active, column = 'vt.is_active') {
  if (active === 'all') return ''
  if (active === 'inactive') return `AND ${column} = false`
  return `AND ${column} = true`
}

function normalizeName(name) {
  return String(name || '').trim()
}

export async function listVariantTypes(
  tenantId,
  { q, active = 'all', includeValues = false } = {},
) {
  const search = q ? String(q).trim() : null
  const activeClause = activeSqlClause(active)

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${typeSelect}
      FROM variant_types vt
      WHERE vt.tenant_id = $1
        ${activeClause}
        AND (
          $2::text IS NULL
          OR vt.name ILIKE '%' || $2 || '%'
        )
      ORDER BY vt.name ASC
    `,
    [search],
  )

  if (!includeValues || rows.length === 0) {
    return rows
  }

  const typeIds = rows.map((r) => r.id)
  const { rows: valueRows } = await tenantQuery(
    tenantId,
    `
      SELECT
        vv.id,
        vv.variant_type_id AS "variantTypeId",
        vv.name,
        vv.is_active AS "isActive",
        vv.created_at AS "createdAt",
        vv.updated_at AS "updatedAt"
      FROM variant_values vv
      WHERE vv.tenant_id = $1
        AND vv.variant_type_id = ANY($2::uuid[])
      ORDER BY vv.name ASC
    `,
    [typeIds],
  )

  const byType = new Map()
  for (const value of valueRows) {
    const list = byType.get(value.variantTypeId) || []
    list.push(value)
    byType.set(value.variantTypeId, list)
  }

  return rows.map((row) => ({
    ...row,
    values: byType.get(row.id) || [],
  }))
}

export async function getVariantTypeById(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${typeSelect}
      FROM variant_types vt
      WHERE vt.tenant_id = $1 AND vt.id = $2
      LIMIT 1
    `,
    [id],
  )
  return rows[0] || null
}

export async function createVariantType(tenantId, { name, isActive = true }) {
  const typeName = normalizeName(name)
  if (!typeName) throw httpError(400, 'Variant type name is required')

  try {
    const { rows } = await tenantQuery(
      tenantId,
      `
        INSERT INTO variant_types (tenant_id, name, is_active)
        VALUES ($1, $2, $3)
        RETURNING
          id,
          name,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          0 AS "valuesCount"
      `,
      [typeName, Boolean(isActive)],
    )
    return rows[0]
  } catch (err) {
    mapPgUniqueViolation(err, 'Variant type name already exists')
  }
}

export async function updateVariantType(tenantId, id, { name, isActive }) {
  const existing = await getVariantTypeById(tenantId, id)
  if (!existing) return null

  const setClauses = ['updated_at = now()']
  const params = [id]

  if (name !== undefined) {
    const typeName = normalizeName(name)
    if (!typeName) throw httpError(400, 'Variant type name is required')
    params.push(typeName)
    setClauses.push(`name = $${params.length + 1}`)
  }

  if (isActive !== undefined) {
    params.push(Boolean(isActive))
    setClauses.push(`is_active = $${params.length + 1}`)
  }

  try {
    const { rows } = await tenantQuery(
      tenantId,
      `
        UPDATE variant_types
        SET ${setClauses.join(', ')}
        WHERE tenant_id = $1 AND id = $2
        RETURNING
          id,
          name,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      params,
    )
    if (!rows[0]) return null
    return getVariantTypeById(tenantId, id)
  } catch (err) {
    mapPgUniqueViolation(err, 'Variant type name already exists')
  }
}

export async function deleteVariantType(tenantId, id) {
  const existing = await getVariantTypeById(tenantId, id)
  if (!existing) return null

  const valuesCount = existing.valuesCount || 0

  const { rowCount } = await tenantQuery(
    tenantId,
    `DELETE FROM variant_types WHERE tenant_id = $1 AND id = $2`,
    [id],
  )

  if (rowCount === 0) return null

  return {
    id: existing.id,
    name: existing.name,
    deletedValuesCount: valuesCount,
  }
}
