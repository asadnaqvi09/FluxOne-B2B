import { listBranchesForLookup, listEmployeesForLookup, listBranchInventory } from './lookup.model.js'
import { resolveInventoryScope } from '../shared.access.js'
import { fail, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'

function scopeError(res, err) {
  if (err?.status) return fail(res, err.message, err.status)
  throw err
}

export async function employees(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const result = await listEmployeesForLookup(tenantId, { ...req.validated.query, branchId })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function branches(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    return success(res, await listBranchesForLookup(tenantId, { branchId }))
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function branchInventory(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const result = await listBranchInventory(tenantId, {
      ...req.validated.query,
      branchId,
    })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return scopeError(res, err)
  }
}
