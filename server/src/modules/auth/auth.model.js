import { query } from '../../config/db.js'
import { normalizeImageUrl } from '../../utils/uploadUrl.util.js'

// Resolve login by User ID (email) only — tenant comes from the matched user row.
// Returns all active matches (normally 0 or 1; >1 if same email exists in multiple tenants).

const AUTH_USER_SELECT = `
  SELECT
    u.id,
    u.tenant_id AS "tenantId",
    u.branch_id AS "branchId",
    u.full_name AS "fullName",
    u.email,
    u.password_hash AS "passwordHash",
    u.is_active AS "isActive",
    r.slug AS role,
    t.slug AS "tenantSlug",
    t.name AS "tenantName",
    b.name AS "branchName",
    COALESCE(u.image_url, s.image_url) AS "imageUrl"
  FROM users u
  JOIN roles r ON r.id = u.role_id
  JOIN tenants t ON t.id = u.tenant_id
  LEFT JOIN branches b ON b.id = u.branch_id AND b.tenant_id = u.tenant_id
  LEFT JOIN staff s ON s.user_id = u.id AND s.tenant_id = u.tenant_id
`

function mapAuthUser(row) {
  if (!row) return null
  return {
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }
}

export async function findAuthUsersByLoginId(loginId) {
  const { rows } = await query(
    `
      ${AUTH_USER_SELECT}
      WHERE lower(u.email) = lower($1)
        AND u.is_active = true
      ORDER BY u.created_at ASC
    `,
    [loginId],
  )
  return rows.map(mapAuthUser)
}

export async function findAuthUserById(id, tenantId) {
  const { rows } = await query(
    `
      ${AUTH_USER_SELECT}
      WHERE u.id = $1
        AND u.tenant_id = $2
      LIMIT 1
    `,
    [id, tenantId],
  )
  return mapAuthUser(rows[0] || null)
}

export async function updatePasswordHash(userId, tenantId, passwordHash) {
  await query(
    `
      UPDATE users
      SET password_hash = $3
      WHERE id = $1 AND tenant_id = $2
    `,
    [userId, tenantId, passwordHash],
  )
}

// Update display name and/or login ID (email column).
export async function updateAuthProfile(userId, tenantId, { fullName, email }) {
  if (email) {
    const { rows: clashes } = await query(
      `
        SELECT id
        FROM users
        WHERE tenant_id = $1
          AND lower(email) = lower($2)
          AND id <> $3
        LIMIT 1
      `,
      [tenantId, email, userId],
    )
    if (clashes[0]) {
      const error = new Error('This User ID is already in use')
      error.status = 409
      throw error
    }
  }

  const { rows } = await query(
    `
      UPDATE users
      SET
        full_name = COALESCE($3, full_name),
        email = COALESCE($4, email)
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `,
    [userId, tenantId, fullName || null, email || null],
  )
  return rows[0] || null
}
