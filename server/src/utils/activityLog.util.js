import { tenantClientQuery, tenantQuery } from '../config/db.js'

export const ACTIVITY_SOURCES = Object.freeze(['pos', 'bm', 'im', 'system'])

/** Known action slugs → verb phrase for TL sentence: "{Name} {verb}" */
const ACTION_VERBS = Object.freeze({
  login: 'logged in',
  logout: 'logged out',
  open_cash_drawer: 'opened the cash drawer',
  close_cash_drawer: 'closed the cash drawer',
  price_change: 'changed a price',
  change_cashier: 'changed cashier',
  stock_in: 'performed stock in',
  stock_out: 'performed stock out',
  stock_adjustment: 'adjusted stock',
  staff_create: 'created staff',
  staff_update: 'updated staff',
  staff_delete: 'deleted staff',
  order_generate: 'generated a purchase order',
  order_approve: 'approved a purchase order',
  sale: 'completed a sale',
  refund: 'processed a refund',
})

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

/**
 * Build TL-facing sentence: "{Person} {verb}" / fallback "performed {action}".
 * Exported for list API mapping.
 */
export function formatActivityMessage(actorName, action) {
  const name = String(actorName || 'Someone').trim() || 'Someone'
  const slug = String(action || '').trim()
  const verb = ACTION_VERBS[slug] || `performed ${slug || 'an action'}`
  return `${name} ${verb}`
}

/**
 * Insert one activity_logs row. Shared by BM / IM / POS ingest / system writers.
 *
 * @param {string} tenantId
 * @param {object} payload
 * @param {string} payload.branchId
 * @param {string|null} [payload.actorUserId]
 * @param {string} payload.actorName
 * @param {string} [payload.actorRole]
 * @param {string} payload.action
 * @param {'pos'|'bm'|'im'|'system'} payload.source
 * @param {string} [payload.entityType]
 * @param {string} [payload.entityId]
 * @param {object} [payload.details]
 * @param {Date|string} [payload.createdAt]
 * @param {string} [payload.posEventId]
 * @param {string} [payload.clientEventId]
 * @param {import('pg').PoolClient} [client] - optional txn client (tenantClientQuery)
 * @returns {Promise<object>} inserted row (camelCase)
 */
export async function logActivity(tenantId, payload = {}, client = null) {
  const branchId = payload.branchId
  if (!branchId) throw httpError(400, 'branchId is required for activity log')

  const actorName = String(payload.actorName || '').trim()
  if (!actorName) throw httpError(400, 'actorName is required for activity log')

  const action = String(payload.action || '').trim()
  if (!action) throw httpError(400, 'action is required for activity log')

  const source = String(payload.source || '').trim()
  if (!ACTIVITY_SOURCES.includes(source)) {
    throw httpError(400, `source must be one of: ${ACTIVITY_SOURCES.join(', ')}`)
  }

  const actorRole = String(payload.actorRole || 'unknown').trim() || 'unknown'
  const details =
    payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
      ? payload.details
      : {}

  const run = client
    ? (text, params) => tenantClientQuery(client, tenantId, text, params)
    : (text, params) => tenantQuery(tenantId, text, params)

  const { rows } = await run(
    `
      INSERT INTO activity_logs (
        tenant_id,
        branch_id,
        source,
        actor_user_id,
        actor_name,
        actor_role,
        action,
        entity_type,
        entity_id,
        details,
        pos_event_id,
        client_event_id,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12,
        COALESCE($13::timestamptz, now())
      )
      RETURNING
        id,
        branch_id AS "branchId",
        source,
        actor_user_id AS "actorUserId",
        actor_name AS "actorName",
        actor_role AS "actorRole",
        action,
        entity_type AS "entityType",
        entity_id AS "entityId",
        details,
        pos_event_id AS "posEventId",
        client_event_id AS "clientEventId",
        created_at AS "createdAt"
    `,
    [
      branchId,
      source,
      payload.actorUserId || null,
      actorName,
      actorRole,
      action,
      payload.entityType || null,
      payload.entityId != null ? String(payload.entityId) : null,
      JSON.stringify(details),
      payload.posEventId || null,
      payload.clientEventId || null,
      payload.createdAt || null,
    ],
  )

  const row = rows[0]
  return {
    ...row,
    message: formatActivityMessage(row.actorName, row.action),
  }
}
