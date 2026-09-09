import bcrypt from 'bcryptjs'
import {
  findAuthUserById,
  findAuthUsersByLoginId,
  updateAuthProfile,
  updatePasswordHash,
} from './auth.model.js'
import { signAuthTokens, verifyRefreshToken } from '../../utils/jwt.util.js'
import { listBranchesForLookup } from '../inventory-manager/lookups/lookup.model.js'
import { ROLES } from '../../config/constants.js'
import { fail, success } from '../../utils/response.util.js'
import { resolveUploadUrl } from '../../utils/uploadUrl.util.js'

function publicUser(user) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug || null,
    tenantName: user.tenantName || null,
    branchId: user.branchId,
    branchName: user.branchName || null,
    imageUrl: user.imageUrl || null,
  }
}

async function branchesForUser(user) {
  if (user.role === ROLES.B2B_ADMIN) {
    const rows = await listBranchesForLookup(user.tenantId)
    return rows.map((b) => ({ id: b.id, name: b.name, code: null }))
  }

  if (user.branchId) {
    return [{ id: user.branchId, name: user.branchName || null, code: null }]
  }

  return []
}

function authPayload(user, tokens) {
  return {
    accessToken: tokens.accessToken,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tenantId: user.tenantId,
    user: publicUser(user),
    branches: [],
  }
}

export async function login(req, res) {
  const { password } = req.validated.body
  const loginId = (req.validated.body.id || req.validated.body.email || '').trim()

  const candidates = await findAuthUsersByLoginId(loginId)
  if (!candidates.length) {
    return fail(res, 'Invalid id or password', 401)
  }

  const matched = []
  for (const candidate of candidates) {
    const ok = await bcrypt.compare(password, candidate.passwordHash)
    if (ok) matched.push(candidate)
  }

  if (!matched.length) {
    return fail(res, 'Invalid id or password', 401)
  }

  if (matched.length > 1) {
    return fail(
      res,
      'This User ID exists in more than one company. Contact your administrator.',
      409,
    )
  }

  const user = matched[0]
  const tokens = signAuthTokens(user)
  const payload = authPayload(user, tokens)
  payload.branches = await branchesForUser(user)
  return success(res, payload)
}

export async function me(req, res) {
  const user = await findAuthUserById(req.user.id, req.tenantId)
  if (!user) {
    return fail(res, 'User not found', 404)
  }
  return success(res, publicUser(user))
}

export async function updateMe(req, res) {
  const body = req.validated.body
  const fullName = body.name?.trim() || undefined
  const loginId = body.id?.trim() || undefined
  const newPassword = body.password || undefined
  // New upload or replace — multer field name `image`
  const imageUrl = resolveUploadUrl(req.file, req) || undefined

  if (!fullName && !loginId && !newPassword && !imageUrl) {
    return fail(res, 'name, id, password, or image is required', 422)
  }

  try {
    if (fullName || loginId || imageUrl) {
      const updated = await updateAuthProfile(req.user.id, req.tenantId, {
        fullName,
        email: loginId,
        imageUrl,
      })
      if (!updated) return fail(res, 'User not found', 404)
    }

    if (newPassword) {
      const nextHash = await bcrypt.hash(newPassword, 10)
      await updatePasswordHash(req.user.id, req.tenantId, nextHash)
    }
  } catch (err) {
    if (err.status === 409) return fail(res, err.message, 409)
    throw err
  }

  const user = await findAuthUserById(req.user.id, req.tenantId)
  if (!user) return fail(res, 'User not found', 404)
  return success(res, {
    ...publicUser(user),
    passwordUpdated: Boolean(newPassword),
  })
}

export async function refresh(req, res) {
  try {
    const decoded = verifyRefreshToken(req.validated.body.refreshToken)
    const user = await findAuthUserById(decoded.sub, decoded.tenantId)
    if (!user || !user.isActive) {
      return fail(res, 'Invalid refresh token', 401)
    }
    const tokens = signAuthTokens(user)
    const payload = authPayload(user, tokens)
    payload.branches = await branchesForUser(user)
    return success(res, payload)
  } catch {
    return fail(res, 'Invalid refresh token', 401)
  }
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.validated.body
  const user = await findAuthUserById(req.user.id, req.tenantId)
  if (!user) {
    return fail(res, 'User not found', 404)
  }
  const match = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!match) {
    return fail(res, 'Current password is incorrect', 401)
  }
  const nextHash = await bcrypt.hash(newPassword, 10)
  await updatePasswordHash(user.id, req.tenantId, nextHash)
  return success(res, { updated: true })
}

export async function logout(_req, res) {
  return success(res, { loggedOut: true })
}
