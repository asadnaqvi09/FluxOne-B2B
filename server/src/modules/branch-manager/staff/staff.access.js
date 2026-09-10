import { ROLES } from '../../../config/constants.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// Roles BM can create via Staff API (excludes BM / B2B admin).
export const CREATABLE_STAFF_ROLES = [
  ROLES.INVENTORY_MANAGER,
  ROLES.CASHIER,
  ROLES.PRODUCTION_STAFF,
  ROLES.DELIVERY_STAFF,
  ROLES.WEBSITE_MANAGER,
]

// SQL `IN (...)` list for creatable staff role slugs.
export const CREATABLE_STAFF_ROLE_SQL = CREATABLE_STAFF_ROLES.map((slug) => `'${slug}'`).join(', ')

// Fixed staff designations auto-mapped from system role (no custom designation picker).
export const STAFF_ROLE_TO_DESIGNATION = {
  [ROLES.INVENTORY_MANAGER]: 'Inventory Manager',
  [ROLES.CASHIER]: 'Cashier',
  [ROLES.PRODUCTION_STAFF]: 'Production Staff',
  [ROLES.DELIVERY_STAFF]: 'Delivery Staff',
  [ROLES.WEBSITE_MANAGER]: 'Website Manager',
}

// Branch Managers are locked to their JWT branch.
// B2B Admins may pass an explicit branchId (required when creating staff).
export function resolveScopedBranchId(req, bodyBranchId) {
  const role = req.user?.role
  const tokenBranchId = req.user?.branchId || null

  if (role === ROLES.BRANCH_MANAGER) {
    if (!tokenBranchId) {
      throw httpError(403, 'Branch Manager account is not assigned to a branch')
    }
    return tokenBranchId
  }

  if (role === ROLES.B2B_ADMIN) {
    return bodyBranchId || null
  }

  return bodyBranchId || tokenBranchId || null
}

// List/filter branch scope — BM always forced to own branch.
export function resolveListBranchId(req, queryBranchId) {
  const role = req.user?.role
  const tokenBranchId = req.user?.branchId || null

  if (role === ROLES.BRANCH_MANAGER) {
    if (!tokenBranchId) {
      throw httpError(403, 'Branch Manager account is not assigned to a branch')
    }
    return tokenBranchId
  }

  return queryBranchId || null
}

// Ensures a staff row is visible/editable for the caller.
// BM: must match JWT branch. B2B: any staff in tenant.
export function assertStaffBranchAccess(req, staffRow) {
  if (!staffRow) {
    throw httpError(404, 'Staff not found')
  }

  if (req.user?.role === ROLES.BRANCH_MANAGER) {
    const tokenBranchId = req.user.branchId || null
    if (!tokenBranchId) {
      throw httpError(403, 'Branch Manager account is not assigned to a branch')
    }
    if (staffRow.branchId !== tokenBranchId) {
      throw httpError(404, 'Staff not found')
    }
  }

  return staffRow
}

// Strip branch reassignment from BM update payloads.
export function sanitizeStaffWritePayload(req, body) {
  const next = { ...body }
  if (req.user?.role === ROLES.BRANCH_MANAGER) {
    delete next.branchId
    next.branchId = req.user.branchId
  }
  return next
}
