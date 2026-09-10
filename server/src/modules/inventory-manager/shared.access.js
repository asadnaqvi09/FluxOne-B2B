import { ROLES } from '../../config/constants.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// Resolve tenant + branch scope for inventory-manager APIs.
// - inventory_manager: JWT branch required (403 if missing)
// - b2b_admin (and other permitted roles): all branches by default; optional ?branchId=
// Never trust client-sent branchId for IM — JWT wins.
export function resolveInventoryScope(req) {
  const tenantId = req.tenantId
  const role = req.user?.role
  const tokenBranchId = req.user?.branchId || null

  if (role === ROLES.INVENTORY_MANAGER) {
    if (!tokenBranchId) {
      throw httpError(403, 'Inventory Manager account is not assigned to a branch')
    }
    return { tenantId, branchId: tokenBranchId }
  }

  const queryBranchId =
    req.validated?.query?.branchId || req.query?.branchId || null
  return { tenantId, branchId: queryBranchId || null }
}

// Scope for CREATE — branch_id must be set (NOT NULL).
// IM: JWT branch. B2B admin: body.branchId required (same pattern as BM staff create).
export function resolveInventoryCreateScope(req) {
  const { tenantId, branchId } = resolveInventoryScope(req)
  if (branchId) return { tenantId, branchId }

  const bodyBranchId = req.validated?.body?.branchId || req.body?.branchId || null
  if (!bodyBranchId) {
    throw httpError(422, 'branchId is required to create inventory records')
  }
  return { tenantId, branchId: bodyBranchId }
}

// Force IM stock destination / allocation to JWT branch; B2B may pass body branchId.
export function resolveInventoryBranchId(req, bodyBranchId = null) {
  const { branchId } = resolveInventoryScope(req)
  if (req.user?.role === ROLES.INVENTORY_MANAGER) {
    return branchId
  }
  return bodyBranchId || branchId || null
}
