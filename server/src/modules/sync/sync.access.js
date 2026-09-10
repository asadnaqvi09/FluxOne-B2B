import { ROLES } from '../../config/constants.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

const BRANCH_LOCKED_ROLES = new Set([
  ROLES.CASHIER,
  ROLES.BRANCH_MANAGER,
  ROLES.INVENTORY_MANAGER,
  ROLES.BRANCH_ADMIN,
])

// Resolve branchId for sync pull (bootstrap/delta).
// Branch-scoped roles must match JWT branchId.
export function resolveSyncPullBranchId(req, queryBranchId) {
  const branchId = queryBranchId || req.user?.branchId || null
  if (!branchId) {
    throw httpError(422, 'branchId is required')
  }

  const tokenBranchId = req.user?.branchId || null
  if (BRANCH_LOCKED_ROLES.has(req.user?.role) && tokenBranchId && tokenBranchId !== branchId) {
    throw httpError(403, 'Branch access denied')
  }

  return branchId
}

// Push resolves branch from body or JWT; branch-scoped roles must match token.
export function resolveSyncPushBranchId(req, bodyBranchId) {
  const branchId = bodyBranchId || req.user?.branchId || null
  if (!branchId) {
    throw httpError(422, 'branchId is required')
  }

  const tokenBranchId = req.user?.branchId || null
  if (BRANCH_LOCKED_ROLES.has(req.user?.role) && tokenBranchId && tokenBranchId !== branchId) {
    throw httpError(403, 'Branch access denied')
  }

  return branchId
}
