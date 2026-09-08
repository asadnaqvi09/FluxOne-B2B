import crypto from 'crypto'
import { tenantClientQuery, tenantQuery, withTransaction } from '../../../config/db.js'
import { ROLE_IDS, ROLES, BRANCH_STATUS } from '../../../config/constants.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function mapPgUniqueViolation(err, message) {
  if (err?.code === '23505') {
    throw httpError(409, message)
  }
  throw err
}

//Readable temp password: meets login min length (8), easy to type once from email/logs.
export function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

const branchSelect = `
  b.id,
  b.name,
  b.location,
  b.image_url AS "imageUrl",
  b.status,
  b.created_at AS "createdAt",
  u.id AS "managerUserId",
  u.full_name AS "managerName",
  u.email AS "managerEmail",
  u.phone AS "managerContact",
  u.other_phone AS "managerOtherContact",
  u.gender AS "managerGender",
  u.address AS "managerAddress",
  u.is_active AS "managerIsActive",
  (
    SELECT count(*)::int
    FROM staff s
    WHERE s.tenant_id = b.tenant_id AND s.branch_id = b.id
  ) AS "totalStaff"
`

function mapBranchRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    location: row.location || '',
    image: normalizeImageUrl(row.imageUrl) || row.imageUrl || '',
    status: row.status || BRANCH_STATUS.OPEN,
    createdAt: row.createdAt,
    totalStaff: row.totalStaff ?? 0,
    manager: row.managerUserId
      ? {
          id: row.managerUserId,
          name: row.managerName || '',
          email: row.managerEmail || '',
          contact: row.managerContact || '',
          otherContact: row.managerOtherContact || '',
          gender: row.managerGender || '',
          address: row.managerAddress || '',
          isActive: row.managerIsActive !== false,
        }
      : null,
  }
}

async function getBranchByIdInTx(client, tenantId, id) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT ${branchSelect}
      FROM branches b
      LEFT JOIN users u
        ON u.tenant_id = b.tenant_id
       AND u.branch_id = b.id
       AND u.role_id = ${ROLE_IDS[ROLES.BRANCH_MANAGER]}
      WHERE b.tenant_id = $1 AND b.id = $2
      ORDER BY u.created_at ASC NULLS LAST
      LIMIT 1
    `,
    [id],
  )
  return mapBranchRow(rows[0] || null)
}

export async function listBranches(tenantId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50))
  const offset = (page - 1) * limit
  const q = filters.q?.trim() || null
  const status = filters.status || null

  const { rows: countRows } = await tenantQuery(
    tenantId,
    `
      SELECT count(*)::int AS total
      FROM branches b
      WHERE b.tenant_id = $1
        AND ($2::text IS NULL OR b.status = $2)
        AND (
          $3::text IS NULL
          OR b.name ILIKE '%' || $3 || '%'
          OR COALESCE(b.location, '') ILIKE '%' || $3 || '%'
          OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.tenant_id = b.tenant_id
              AND u.branch_id = b.id
              AND u.role_id = ${ROLE_IDS[ROLES.BRANCH_MANAGER]}
              AND (
                u.full_name ILIKE '%' || $3 || '%'
                OR u.email ILIKE '%' || $3 || '%'
              )
          )
        )
    `,
    [status, q],
  )

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        b.id,
        b.name,
        b.location,
        b.image_url AS "imageUrl",
        b.status,
        b.created_at AS "createdAt",
        u.id AS "managerUserId",
        u.full_name AS "managerName",
        u.email AS "managerEmail",
        u.phone AS "managerContact",
        u.other_phone AS "managerOtherContact",
        u.gender AS "managerGender",
        u.address AS "managerAddress",
        u.is_active AS "managerIsActive",
        (
          SELECT count(*)::int
          FROM staff s
          WHERE s.tenant_id = b.tenant_id AND s.branch_id = b.id
        ) AS "totalStaff"
      FROM branches b
      LEFT JOIN LATERAL (
        SELECT *
        FROM users um
        WHERE um.tenant_id = b.tenant_id
          AND um.branch_id = b.id
          AND um.role_id = ${ROLE_IDS[ROLES.BRANCH_MANAGER]}
        ORDER BY um.created_at ASC
        LIMIT 1
      ) u ON true
      WHERE b.tenant_id = $1
        AND ($2::text IS NULL OR b.status = $2)
        AND (
          $3::text IS NULL
          OR b.name ILIKE '%' || $3 || '%'
          OR COALESCE(b.location, '') ILIKE '%' || $3 || '%'
          OR COALESCE(u.full_name, '') ILIKE '%' || $3 || '%'
          OR COALESCE(u.email, '') ILIKE '%' || $3 || '%'
        )
      ORDER BY b.name ASC, b.created_at ASC
      LIMIT $4 OFFSET $5
    `,
    [status, q, limit, offset],
  )

  return {
    items: rows.map(mapBranchRow),
    total: countRows[0]?.total || 0,
    page,
    limit,
  }
}

export async function getBranchById(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${branchSelect}
      FROM branches b
      LEFT JOIN users u
        ON u.tenant_id = b.tenant_id
       AND u.branch_id = b.id
       AND u.role_id = ${ROLE_IDS[ROLES.BRANCH_MANAGER]}
      WHERE b.tenant_id = $1 AND b.id = $2
      ORDER BY u.created_at ASC NULLS LAST
      LIMIT 1
    `,
    [id],
  )
  return mapBranchRow(rows[0] || null)
}

//One transaction: branch + BM user. Caller supplies passwordHash + plaintext for email.
export async function createBranchWithManager(tenantId, payload) {
  try {
    return await withTransaction(async (client) => {
      const { rows: branchRows } = await tenantClientQuery(
        client,
        tenantId,
        `
          INSERT INTO branches (tenant_id, name, location, image_url, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [
          payload.name.trim(),
          payload.location?.trim() || null,
          payload.image || payload.imageUrl || null,
          payload.status || BRANCH_STATUS.OPEN,
        ],
      )

      const branchId = branchRows[0].id

      await tenantClientQuery(
        client,
        tenantId,
        `
          INSERT INTO users (
            tenant_id, branch_id, role_id, full_name, email, password_hash,
            phone, other_phone, gender, address, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        `,
        [
          branchId,
          ROLE_IDS[ROLES.BRANCH_MANAGER],
          payload.manager.name.trim(),
          payload.manager.email.trim().toLowerCase(),
          payload.passwordHash,
          payload.manager.contact?.trim() || null,
          payload.manager.otherContact?.trim() || null,
          payload.manager.gender?.trim() || null,
          payload.manager.address?.trim() || null,
        ],
      )

      return getBranchByIdInTx(client, tenantId, branchId)
    })
  } catch (err) {
    mapPgUniqueViolation(err, 'A user with this email already exists for this company')
  }
}

export async function updateBranch(tenantId, id, payload) {
  try {
    return await withTransaction(async (client) => {
      const existing = await getBranchByIdInTx(client, tenantId, id)
      if (!existing) throw httpError(404, 'Branch not found')

      if (
        payload.name !== undefined ||
        payload.location !== undefined ||
        payload.image !== undefined ||
        payload.imageUrl !== undefined
      ) {
        await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE branches
            SET
              name = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE name END,
              location = CASE WHEN $4::boolean THEN $5 ELSE location END,
              image_url = CASE WHEN $6::boolean THEN $7 ELSE image_url END
            WHERE tenant_id = $1 AND id = $2
          `,
          [
            id,
            payload.name !== undefined ? payload.name.trim() : null,
            payload.location !== undefined,
            payload.location !== undefined ? payload.location?.trim() || null : null,
            payload.image !== undefined || payload.imageUrl !== undefined,
            payload.image !== undefined || payload.imageUrl !== undefined
              ? payload.image || payload.imageUrl || null
              : null,
          ],
        )
      }

      if (payload.manager && existing.manager?.id) {
        const m = payload.manager
        await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE users
            SET
              full_name = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE full_name END,
              email = CASE WHEN $4::text IS NOT NULL THEN lower($4) ELSE email END,
              phone = CASE WHEN $5::boolean THEN $6 ELSE phone END,
              other_phone = CASE WHEN $7::boolean THEN $8 ELSE other_phone END,
              gender = CASE WHEN $9::boolean THEN $10 ELSE gender END,
              address = CASE WHEN $11::boolean THEN $12 ELSE address END
            WHERE tenant_id = $1
              AND id = $2
              AND role_id = ${ROLE_IDS[ROLES.BRANCH_MANAGER]}
          `,
          [
            existing.manager.id,
            m.name !== undefined ? m.name.trim() : null,
            m.email !== undefined ? m.email.trim() : null,
            m.contact !== undefined,
            m.contact !== undefined ? m.contact?.trim() || null : null,
            m.otherContact !== undefined,
            m.otherContact !== undefined ? m.otherContact?.trim() || null : null,
            m.gender !== undefined,
            m.gender !== undefined ? m.gender?.trim() || null : null,
            m.address !== undefined,
            m.address !== undefined ? m.address?.trim() || null : null,
          ],
        )
      } else if (payload.manager && !existing.manager?.id) {
        throw httpError(400, 'Branch has no manager to update')
      }

      return getBranchByIdInTx(client, tenantId, id)
    })
  } catch (err) {
    mapPgUniqueViolation(err, 'A user with this email already exists for this company')
  }
}

export async function setBranchStatus(tenantId, id, status) {
  return withTransaction(async (client) => {
    const existing = await getBranchByIdInTx(client, tenantId, id)
    if (!existing) throw httpError(404, 'Branch not found')

    await tenantClientQuery(
      client,
      tenantId,
      `
        UPDATE branches
        SET status = $3
        WHERE tenant_id = $1 AND id = $2
      `,
      [id, status],
    )

    const managerActive = status === BRANCH_STATUS.OPEN
    await tenantClientQuery(
      client,
      tenantId,
      `
        UPDATE users
        SET is_active = $3
        WHERE tenant_id = $1
          AND branch_id = $2
          AND role_id = ${ROLE_IDS[ROLES.BRANCH_MANAGER]}
      `,
      [id, managerActive],
    )

    return getBranchByIdInTx(client, tenantId, id)
  })
}

export async function resetBranchManagerPassword(tenantId, id, passwordHash) {
  return withTransaction(async (client) => {
    const existing = await getBranchByIdInTx(client, tenantId, id)
    if (!existing) throw httpError(404, 'Branch not found')
    if (!existing.manager?.id) throw httpError(404, 'Branch manager not found')

    await tenantClientQuery(
      client,
      tenantId,
      `
        UPDATE users
        SET password_hash = $3
        WHERE tenant_id = $1 AND id = $2
      `,
      [existing.manager.id, passwordHash],
    )

    return existing
  })
}

export async function getTenantName(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT name FROM tenants WHERE id = $1 LIMIT 1`,
    [],
  )
  return rows[0]?.name || null
}
