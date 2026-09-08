import { getAdminDashboard } from './dashboard.model.js'
import { success, fail } from '../../../utils/response.util.js'

export async function overview(req, res) {
  try {
    const data = await getAdminDashboard(req.tenantId, req.validated.query)
    return success(res, data)
  } catch (err) {
    if (err.status === 404) return fail(res, err.message, 404)
    throw err
  }
}
