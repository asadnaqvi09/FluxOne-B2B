import { query } from '../../config/db.js'

export async function insertRefreshToken({
  jti,
  userId,
  tenantId,
  tokenHash,
  expiresAt,
  userAgent = null,
  ipAddress = null,
}) {
  const { rows } = await query(
    `
      INSERT INTO refresh_tokens (
        jti, user_id, tenant_id, token_hash, expires_at, user_agent, ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        jti,
        user_id AS "userId",
        tenant_id AS "tenantId",
        token_hash AS "tokenHash",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
    `,
    [jti, userId, tenantId, tokenHash, expiresAt, userAgent, ipAddress],
  )
  return rows[0]
}

export async function findRefreshTokenByJti(jti) {
  const { rows } = await query(
    `
      SELECT
        id,
        jti,
        user_id AS "userId",
        tenant_id AS "tenantId",
        token_hash AS "tokenHash",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt",
        replaced_by_jti AS "replacedByJti"
      FROM refresh_tokens
      WHERE jti = $1
      LIMIT 1
    `,
    [jti],
  )
  return rows[0] || null
}

export async function revokeRefreshTokenByJti(jti, { replacedByJti = null } = {}) {
  const { rowCount } = await query(
    `
      UPDATE refresh_tokens
      SET
        revoked_at = COALESCE(revoked_at, now()),
        replaced_by_jti = COALESCE($2, replaced_by_jti)
      WHERE jti = $1
        AND revoked_at IS NULL
    `,
    [jti, replacedByJti],
  )
  return rowCount > 0
}

export async function revokeAllRefreshTokensForUser(userId, tenantId) {
  const { rowCount } = await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE user_id = $1
        AND tenant_id = $2
        AND revoked_at IS NULL
    `,
    [userId, tenantId],
  )
  return rowCount
}

export async function revokeRefreshTokenByHash(tokenHash) {
  const { rowCount } = await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE token_hash = $1
        AND revoked_at IS NULL
    `,
    [tokenHash],
  )
  return rowCount > 0
}
