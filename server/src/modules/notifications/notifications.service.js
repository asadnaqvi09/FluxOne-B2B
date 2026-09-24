import {
  createNotificationsForUsers,
  listTenantAdminUserIds,
  createNotification,
} from './notifications.model.js'

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

function formatRange(start, end) {
  const opts = { weekday: 'short', month: 'short', day: 'numeric' }
  const a = start ? new Date(start) : null
  const b = end ? new Date(end) : null
  if (!a || Number.isNaN(a.getTime()) || !b || Number.isNaN(b.getTime())) return '—'
  const left = a.toLocaleDateString('en-US', opts)
  const right = b.toLocaleDateString('en-US', opts)
  return left === right ? left : `${left} – ${right}`
}
