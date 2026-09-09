import {
  buildBootstrapSnapshot,
  buildDeltaSnapshot,
  ingestSyncEvent,
  listSalesForPosPull,
  listSyncEvents,
} from './sync.model.js'
import {
  bootstrapQuerySchema,
  deltaQuerySchema,
  normalizeSyncEventPayload,
  parseSchemaOrThrow,
  pushBodySchema,
  salesPullQuerySchema,
} from './sync.validator.js'
import { resolveSyncPullBranchId, resolveSyncPushBranchId } from './sync.access.js'
import { mapSnapshotForPos } from './sync.mapper.js'
import { success } from '../../utils/response.util.js'
import { paginatedResult } from '../../utils/pagination.util.js'

export async function push(req, res) {
  const parsed = parseSchemaOrThrow(pushBodySchema, req.body, 'Push body')
  const branchId = resolveSyncPushBranchId(req, parsed.branchId)

  const accepted = []
  const rejected = []
  const events = []

  for (const event of parsed.events) {
    const normalized = {
      ...event,
      deviceId: event.deviceId || parsed.deviceId || null,
      payload: normalizeSyncEventPayload(event.eventType, event.payload),
    }

    try {
      const row = await ingestSyncEvent(
        req.tenantId,
        {
          ...normalized,
          branchId,
          syncedBy: req.user.id,
        },
        req.user.id,
      )
      events.push(row)
      accepted.push(row.clientEventId)
    } catch (err) {
      console.error('[sync/push] event rejected', {
        clientEventId: event.clientEventId,
        eventType: event.eventType,
        reason: err.message || 'Event rejected',
        details: err.details || null,
        payload: normalized.payload,
      })
      rejected.push({
        clientEventId: event.clientEventId,
        reason: err.message || 'Event rejected',
        ...(err.details ? { details: err.details } : {}),
      })
    }
  }

  return success(
    res,
    {
      accepted,
      rejected,
      events,
      acceptedCount: accepted.length,
    },
    202,
  )
}

export async function bootstrap(req, res) {
  const { branchId } = parseSchemaOrThrow(bootstrapQuerySchema, req.query, 'Bootstrap query')
  const resolvedBranchId = resolveSyncPullBranchId(req, branchId)
  const snapshot = await buildBootstrapSnapshot(req.tenantId, resolvedBranchId)
  return success(res, mapSnapshotForPos(snapshot))
}

export async function delta(req, res) {
  const { branchId, since } = parseSchemaOrThrow(deltaQuerySchema, req.query, 'Delta query')
  const resolvedBranchId = resolveSyncPullBranchId(req, branchId)
  const snapshot = await buildDeltaSnapshot(req.tenantId, resolvedBranchId, since)
  return success(res, mapSnapshotForPos(snapshot))
}

/** Cloud → POS invoice history (paginated, current state per saleNumber). */
export async function sales(req, res) {
  const query = parseSchemaOrThrow(salesPullQuerySchema, req.query, 'Sales pull query')
  const branchId = resolveSyncPullBranchId(req, query.branchId)
  const result = await listSalesForPosPull(req.tenantId, {
    branchId,
    page: query.page,
    limit: query.limit,
  })
  return success(res, paginatedResult(result.items, result))
}

/** Cloud pos_sync_events audit log — not POS catalog. */
export async function events(req, res) {
  const rows = await listSyncEvents(req.tenantId, { since: req.query.since })
  return success(res, rows)
}

/** @deprecated Use GET /api/sync/bootstrap and /api/sync/delta for POS catalog sync. */
export async function pull(req, res) {
  return events(req, res)
}
