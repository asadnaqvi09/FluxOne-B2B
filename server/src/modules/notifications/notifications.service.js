import {
  createNotificationsForUsers,
  listTenantAdminUserIds,
  listUserIdsByRole,
  createNotification,
} from './notifications.model.js'
import { ROLES } from '../../config/constants.js'

// BM submitted personal leave → notify all tenant admins
export async function notifyAdminsOfLeaveRequest(tenantId, leave, { managerName, branchName }) {
  const adminIds = await listTenantAdminUserIds(tenantId)
  if (!adminIds.length) return []

  const name = managerName || 'Branch Manager'
  const branch = branchName || 'their branch'
  const dates = formatRange(leave.startDate, leave.endDate)

  // Short header + full detail body (bell / inbox)
  const title = 'New Leave Request From Employee'
  const body = `New leave request submitted by ${name} of branch (${branch}) for (${dates}) and awaiting your approval.`

  return createNotificationsForUsers(tenantId, adminIds, {
    type: 'leave_request',
    title,
    body,
    linkPath: `/admin/leaves?highlight=${leave.id}`,
    entityType: 'leave',
    entityId: leave.id,
    meta: {
      leaveId: leave.id,
      managerName: name,
      branchName: branch,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason || null,
    },
  })
}

// Admin decided BM leave → notify the requesting BM (in-app)
export async function notifyBmOfLeaveDecision(tenantId, leave, { status, decisionReason, decidedByName }) {
  if (!leave?.requestedBy) return null

  const approved = status === 'approved'
  const title = approved
    ? 'Your leave request was approved.'
    : 'Your leave request was rejected.'
  const reasonNote = decisionReason ? ` Reason: ${decisionReason}` : ''

  return createNotification(tenantId, {
    recipientUserId: leave.requestedBy,
    type: 'leave_decision',
    title,
    body: `Status: ${status}.${reasonNote}`,
    linkPath: `/branch/leaves?tab=mine&highlight=${leave.id}`,
    entityType: 'leave',
    entityId: leave.id,
    meta: {
      leaveId: leave.id,
      status,
      decisionReason: decisionReason || null,
      decidedByName: decidedByName || null,
      startDate: leave.startDate,
      endDate: leave.endDate,
    },
  })
}

// BM replenishment / low-stock request → notify Inventory Managers
export async function notifyInventoryManagersOfStockRequest(
  tenantId,
  request,
  { managerName, branchName } = {},
) {
  const imIds = await listUserIdsByRole(tenantId, ROLES.INVENTORY_MANAGER)
  if (!imIds.length) return []

  const name = managerName || 'Branch Manager'
  const branch = branchName || 'a branch'
  const product = request.productName || 'a product'
  const qty = Number(request.remainingQuantity)
  const qtyLabel = Number.isFinite(qty) ? String(Math.floor(qty)) : '—'
  const isAlert = request.kind === 'alert'
  const title = isAlert
    ? 'Low Stock Alert From Branch'
    : 'New Replenishment Request'
  const body = isAlert
    ? `${name} (${branch}) flagged low stock for ${product}. Required quantity: ${qtyLabel}.`
    : `${name} (${branch}) requested ${qtyLabel} unit(s) of ${product}. Open Stock Alerts to process.`

  return createNotificationsForUsers(tenantId, imIds, {
    type: 'stock_request',
    title,
    body,
    linkPath: `/inventory`,
    entityType: 'stock_request',
    entityId: request.id,
    meta: {
      stockRequestId: request.id,
      productId: request.productId || null,
      productName: product,
      branchName: branch,
      managerName: name,
      kind: request.kind,
      requiredQuantity: Number.isFinite(qty) ? Math.floor(qty) : null,
    },
  })
}

function formatRange(start, end) {
  const opts = { weekday: 'short', month: 'short', day: 'numeric' }
  const a = start ? new Date(start) : null
  const b = end ? new Date(end) : null
  if (!a || Number.isNaN(a.getTime()) || !b || Number.isNaN(b.getTime())) return '—'
  const left = a.toLocaleDateString('en-US', opts)
  const right = b.toLocaleDateString('en-US', opts)
  return left === right ? left : `${left} – ${right}`
}
