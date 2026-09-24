import {
  getCurrencySettings,
  listDevices,
  updateCurrencySettings,
  updateDeviceStatus,
} from './settings.model.js'
import { fail, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'

export async function devicesList(req, res) {
  const result = await listDevices(req.tenantId, req.validated.query)
  return success(res, {
    ...paginatedResult(result.items, result),
    stats: {
      total: result.registered ?? result.total,
      active: result.active,
      blocked: result.blocked,
    },
  })
}

export async function patchDeviceStatus(req, res) {
  try {
    const row = await updateDeviceStatus(
      req.tenantId,
      req.validated.params.id,
      req.validated.body.status,
    )
    return success(res, row)
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status)
    throw err
  }
}

export async function currencyGet(req, res) {
  const data = await getCurrencySettings(req.tenantId)
  return success(res, data)
}

export async function currencyPatch(req, res) {
  try {
    const data = await updateCurrencySettings(
      req.tenantId,
      req.validated.body.defaultCurrency,
    )
    return success(res, data)
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status)
    throw err
  }
}
