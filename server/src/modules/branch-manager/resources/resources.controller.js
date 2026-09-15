import {
  createHardware,
  deleteHardware,
  listHardware,
  updateHardware,
} from './hardware.model.js'
import {
  createItemScale,
  deleteItemScale,
  listItemScales,
  updateItemScale,
} from './scales.model.js'
import { ROLES } from '../../../config/constants.js'
import { fail, success } from '../../../utils/response.util.js'
import { resolveUploadUrl } from '../../../utils/uploadUrl.util.js'

function resolveBranchId(req, explicit) {
  if (req.user?.role === ROLES.BRANCH_MANAGER) {
    return req.user.branchId || null
  }
  return explicit || req.user?.branchId || null
}

function sendModelError(res, err, fallback) {
  const status = err?.status || 500
  return fail(res, err?.message || fallback, status)
}

export async function hardwareList(req, res) {
  try {
    const branchId = resolveBranchId(req, req.query.branchId)
    if (req.user?.role === ROLES.BRANCH_MANAGER && !branchId) {
      return fail(res, 'Branch context is required', 400)
    }
    const type = req.query.type || undefined
    const q = req.query.q || undefined
    const rows = await listHardware(req.tenantId, { branchId, type, q })
    return success(res, rows)
  } catch (err) {
    return sendModelError(res, err, 'Failed to list hardware')
  }
}

export async function hardwareCreate(req, res) {
  try {
    const branchId = resolveBranchId(req, req.body.branchId)
    if (!branchId) {
      return fail(res, 'branchId is required', 400)
    }
    const imageUrl = resolveUploadUrl(req.file, req)
    const row = await createHardware(req.tenantId, {
      ...req.body,
      branchId,
      imageUrl: imageUrl || req.body.imageUrl || null,
    })
    return success(res, row, 201)
  } catch (err) {
    return sendModelError(res, err, 'Failed to create hardware')
  }
}

export async function hardwareUpdate(req, res) {
  try {
    const branchId = resolveBranchId(req, req.body.branchId)
    const imageUrl = resolveUploadUrl(req.file, req)
    const payload = { ...req.body }
    if (imageUrl) {
      payload.imageUrl = imageUrl
      delete payload.image
    } else {
      // Keep existing image when no new file is uploaded.
      delete payload.image
      delete payload.imageUrl
    }
    const row = await updateHardware(req.tenantId, req.params.id, payload, { branchId })
    if (!row) return fail(res, 'Hardware not found', 404)
    return success(res, row)
  } catch (err) {
    return sendModelError(res, err, 'Failed to update hardware')
  }
}

export async function hardwareRemove(req, res) {
  try {
    const branchId = resolveBranchId(req, req.query.branchId)
    const row = await deleteHardware(req.tenantId, req.params.id, { branchId })
    if (!row) return fail(res, 'Hardware not found', 404)
    return success(res, { message: 'Hardware deleted successfully', id: row.id })
  } catch (err) {
    return sendModelError(res, err, 'Failed to delete hardware')
  }
}

export async function scalesList(req, res) {
  try {
    const q = req.query.q || undefined
    const rows = await listItemScales(req.tenantId, { q })
    return success(res, rows)
  } catch (err) {
    return sendModelError(res, err, 'Failed to list scales')
  }
}

export async function scalesCreate(req, res) {
  try {
    const row = await createItemScale(req.tenantId, req.body)
    return success(res, row, 201)
  } catch (err) {
    return sendModelError(res, err, 'Failed to create scale')
  }
}

export async function scalesUpdate(req, res) {
  try {
    const row = await updateItemScale(req.tenantId, req.params.id, req.body)
    if (!row) return fail(res, 'Scale not found', 404)
    return success(res, row)
  } catch (err) {
    return sendModelError(res, err, 'Failed to update scale')
  }
}

export async function scalesRemove(req, res) {
  try {
    const row = await deleteItemScale(req.tenantId, req.params.id)
    if (!row) return fail(res, 'Scale not found', 404)
    return success(res, { message: 'Scale deleted successfully', id: row.id })
  } catch (err) {
    return sendModelError(res, err, 'Failed to delete scale')
  }
}
