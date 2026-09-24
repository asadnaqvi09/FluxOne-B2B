import { createStockRequest, listStockRequests } from './stock_request.model.js'
import { notifyInventoryManagersOfStockRequest } from '../../notifications/notifications.service.js'
import { success, fail, failFromError } from '../../../utils/response.util.js'

export async function stockRequestList(req, res) {
  return success(res, await listStockRequests(req.tenantId, req.validated.query))
}

export async function addStockRequest(req, res) {
  try {
    const row = await createStockRequest(req.tenantId, {
      ...req.validated.body,
      createdBy: req.user.id,
      branchId: req.validated.body.branchId || req.user.branchId,
    })

    // Alert Inventory Managers (bell + Notifications page)
    try {
      await notifyInventoryManagersOfStockRequest(req.tenantId, row, {
        managerName: req.user.name || req.user.fullName || 'Branch Manager',
        branchName: row.branchName,
      })
    } catch (notifyErr) {
      console.error(
        '[stock-requests] Failed to notify inventory managers:',
        notifyErr?.message || notifyErr,
      )
    }

    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create stock request')
  }
}
