import crypto from 'crypto'
import jwt from 'jsonwebtoken'

function accessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('Missing JWT_ACCESS_SECRET')
  return secret
}

function refreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('Missing JWT_REFRESH_SECRET')
  return secret
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function newTokenId() {
  return crypto.randomUUID()
}

/** Parse JWT-style duration (e.g. 15m, 7d) to milliseconds. */
export function durationToMs(raw, fallbackMs) {
  const match = String(raw || '').match(/^(\d+)([smhd]?)$/i)
  if (!match) return fallbackMs
  const value = Number(match[1])
  const unit = (match[2] || 's').toLowerCase()
  if (unit === 'm') return value * 60_000
  if (unit === 'h') return value * 3_600_000
  if (unit === 'd') return value * 86_400_000
  return value * 1000
}

export function getRefreshTokenExpiresAt() {
  const ms = durationToMs(process.env.JWT_REFRESH_EXPIRES || '7d', 7 * 86_400_000)
  return new Date(Date.now() + ms)
}

export function signAccessToken(payload) {
  return jwt.sign(payload, accessSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  })
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, refreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret())
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret())
}

export function buildAuthPayload(user, { jti } = {}) {
  const payload = {
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug || null,
    branchId: user.branchId || null,
  }
  if (jti) payload.jti = jti
  return payload
}

/** Sign access + refresh JWTs. Caller must persist refresh jti/hash for revocation. */
export function signAuthTokens(user, { jti = newTokenId() } = {}) {
  const accessPayload = buildAuthPayload(user)
  const refreshPayload = buildAuthPayload(user, { jti })

  return {
    accessToken: signAccessToken(accessPayload),
    refreshToken: signRefreshToken(refreshPayload),
    expiresIn: getAccessTokenExpiresInSeconds(),
    jti,
  }
}

// Seconds until access token expiry (for POS login contract).
export function getAccessTokenExpiresInSeconds() {
  const raw = process.env.JWT_ACCESS_EXPIRES || '15m'
  const match = String(raw).match(/^(\d+)([smhd]?)$/i)
  if (!match) return 3600
  const value = Number(match[1])
  const unit = (match[2] || 's').toLowerCase()
  if (unit === 'm') return value * 60
  if (unit === 'h') return value * 3600
  if (unit === 'd') return value * 86400
  return value
}
