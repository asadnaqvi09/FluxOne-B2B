import { pool } from '../config/db.js'
import { verifyAccessToken } from '../utils/jwt.util.js'
import { error } from '../utils/response.util.js'

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      return error(res, 'Authentication required', 401)
    }

    const decoded = verifyAccessToken(token)
    if (!decoded.tenantId) {
      return error(res, 'Token is missing tenant_id', 403)
    }

    const { rows } = await pool.query(
      `
        SELECT is_active AS "isActive"
        FROM users
        WHERE id = $1 AND tenant_id = $2
        LIMIT 1
      `,
      [decoded.sub, decoded.tenantId],
    )
    const userRow = rows[0]
    if (!userRow) {
      return error(res, 'Invalid or expired token', 401)
    }
    if (!userRow.isActive) {
      return error(res, 'Account deactivated. Contact your Branch Manager.', 401)
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
      tenantId: decoded.tenantId,
      branchId: decoded.branchId || null,
    }
    req.tenantId = decoded.tenantId
    next()
  } catch (err) {
    // Expired or forged JWT only. A database blip must not look like a logout.
    const name = err?.name
    if (name === 'TokenExpiredError' || name === 'JsonWebTokenError' || name === 'NotBeforeError') {
      return error(res, 'Invalid or expired token', 401)
    }
    return next(err)
  }
}
