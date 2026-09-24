import {
  listManagerLeaveRequests,
  getLeaveById,
  decideLeave,
} from '../../branch-manager/leaves/leaves.model.js'
import { notifyBmOfLeaveDecision } from '../../notifications/notifications.service.js'
// import { sendLeaveDecisionEmail } from '../../../mail/mail.service.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'
import { matchesDisplayRef, normalizeSearchQuery } from '../../../utils/displayRef.util.js'
import { tenantQuery } from '../../../config/db.js'
import { success, fail } from '../../../utils/response.util.js'

// Admin inbox of BM self-leave requests
export async function managerLeavesList(req, res) {
  const branchId = req.query?.branchId || null
  const status = req.query?.status || null
  const q = normalizeSearchQuery(req.query?.q || '').toLowerCase()
  const rows = await listManagerLeaveRequests(req.tenantId, { branchId, status })

  const mapped = rows.map((row) => ({
    ...row,
    managerImageUrl: normalizeImageUrl(row.managerImageUrl) || row.managerImageUrl || null,
  }))

  // Search by Leave ID (UUID or LV-XXXXXXXX) or manager name
  const filtered = q
    ? mapped.filter((row) => {
        const name = String(row.managerName || '').toLowerCase()
        return matchesDisplayRef(row.id, q, 'LV') || name.includes(q)
      })
    : mapped

  return success(res, filtered)
}

export async function decideManagerLeave(req, res) {
  const { id } = req.params
  const { status, decisionReason } = req.body

  try {
    if (status === 'rejected' && !String(decisionReason || '').trim()) {
      return fail(res, 'A reason is required when rejecting a leave request', 400)
    }

    const existing = await getLeaveById(req.tenantId, id)
    if (!existing || existing.leaveFor !== 'branch_manager') {
      return fail(res, 'Leave request not found', 404)
    }
    if (existing.status !== 'pending') {
      return fail(res, 'Only pending leave requests can be decided', 400)
    }

    const updated = await decideLeave(req.tenantId, id, {
      status,
      decidedBy: req.user.id,
      decisionReason: decisionReason?.trim() || null,
    })
    if (!updated) {
      return fail(res, 'Leave request could not be updated', 409)
    }

    // In-app + email notify BM (non-blocking)
    try {
      const { rows: bmRows } = await tenantQuery(
        req.tenantId,
        `
          SELECT
            u.full_name AS "managerName",
            u.email AS "managerEmail",
            b.name AS "branchName"
          FROM users u
          LEFT JOIN branches b ON b.id = $2 AND b.tenant_id = u.tenant_id
          WHERE u.tenant_id = $1 AND u.id = $3
          LIMIT 1
        `,
        [updated.branchId, updated.requestedBy],
      )
      const bm = bmRows[0] || {}

      // await notifyBmOfLeaveDecision(req.tenantId, updated, {
      //   status,
      //   decisionReason: updated.decisionReason,
      //   decidedByName: req.user.name || 'Admin',
      // })

      // if (bm.managerEmail) {
      //   await sendLeaveDecisionEmail({
      //     toEmail: bm.managerEmail,
      //     recipientName: bm.managerName,
      //     status,
      //     startDate: updated.startDate,
      //     endDate: updated.endDate,
      //     reason: updated.reason,
      //     decisionReason: updated.decisionReason,
      //     branchName: bm.branchName || existing.branchName,
      //     companyName: null,
      //     decidedByName: req.user.name || 'Admin',
      //   })
      // }
    } catch (notifyErr) {
      console.error('[admin/leaves] Failed to notify BM:', notifyErr?.message || notifyErr)
    }

    return success(res, {
      message: status === 'approved' ? 'Leave approved' : 'Leave rejected',
      leave: updated,
    })
  } catch (err) {
    return fail(res, err.message || 'Failed to decide leave request', err.status || 500)
  }
}
