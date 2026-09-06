import { tenantClientQuery, tenantQuery, withTransaction } from '../../config/db.js'
import { MOVEMENT_TYPES, ROLES } from '../../config/constants.js'
import { insertLedgerEventInTx } from '../inventory-manager/control/control.model.js'
import {
  validateProductPricePayload,
  validateRefundPayload,
  validateSalePayload,
} from './sync.validator.js'
import { normalizeImageUrl } from '../../utils/uploadUrl.util.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// ---------------------------------------------------------------------------
// Sync event storage
// ---------------------------------------------------------------------------

async function insertSyncEventInTx(client, tenantId, event) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO pos_sync_events (
        tenant_id, branch_id, device_id, event_type, payload, client_event_id, synced_by
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      ON CONFLICT (tenant_id, client_event_id) DO NOTHING
      RETURNING
        id,
        client_event_id AS "clientEventId",
        event_type AS "eventType",
        payload,
        branch_id AS "branchId"
    `,
    [
      event.branchId || null,
      event.deviceId || null,
      event.eventType,
      JSON.stringify(event.payload || {}),
      event.clientEventId,
      event.syncedBy || null,
    ],
  )

  if (rows[0]) return { ...rows[0], inserted: true }

  const { rows: existing } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT
        id,
        client_event_id AS "clientEventId",
        event_type AS "eventType",
        payload,
        branch_id AS "branchId"
      FROM pos_sync_events
      WHERE tenant_id = $1 AND client_event_id = $2
      LIMIT 1
    `,
    [event.clientEventId],
  )
  return existing[0] ? { ...existing[0], inserted: false } : null
}

export async function insertSyncEvent(tenantId, event) {
  return withTransaction((client) => insertSyncEventInTx(client, tenantId, event))
}

async function eventAlreadyProcessed(client, tenantId, posEventId) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id FROM sales WHERE tenant_id = $1 AND pos_event_id = $2
      UNION ALL
      SELECT id FROM inventory_ledger WHERE tenant_id = $1 AND pos_event_id = $2
      LIMIT 1
    `,
    [posEventId],
  )
  return Boolean(rows[0])
}

async function upsertPosCounter(client, tenantId, branchId, code) {
  if (!code) return null
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO pos_counters (tenant_id, branch_id, code, name, is_active)
      VALUES ($1, $2, $3, $3, true)
      ON CONFLICT (tenant_id, branch_id, code)
      DO UPDATE SET is_active = true
      RETURNING id
    `,
    [branchId, code],
  )
  return rows[0]?.id || null
}

async function resolveStaffId(client, tenantId, userId, branchId) {
  if (!userId) return null
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT s.id
      FROM staff s
      WHERE s.tenant_id = $1 AND s.user_id = $2
        AND ($3::uuid IS NULL OR s.branch_id = $3)
      LIMIT 1
    `,
    [userId, branchId],
  )
  return rows[0]?.id || null
}

async function insertSaleInTx(client, tenantId, { branchId, counterId, payload, staffId, posEventId }) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO sales (
        tenant_id, branch_id, counter_id, sale_number, sold_at,
        subtotal, tax_amount, discount_amount, final_amount,
        paid_amount, return_amount, status, staff_id, pos_event_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `,
    [
      branchId,
      counterId,
      payload.saleNumber || null,
      payload.soldAt || new Date().toISOString(),
      payload.subtotal ?? 0,
      payload.taxAmount ?? 0,
      payload.discountAmount ?? 0,
      payload.finalAmount ?? 0,
      payload.paidAmount ?? 0,
      payload.returnAmount ?? 0,
      payload.status || 'completed',
      staffId,
      posEventId,
    ],
  )
  return rows[0].id
}

async function insertSaleItemsInTx(client, tenantId, saleId, lines) {
  for (const line of lines) {
    await tenantClientQuery(
      client,
      tenantId,
      `
        INSERT INTO sale_items (
          tenant_id, sale_id, product_id, quantity, unit_price,
          discount_amount, tax_amount, line_total, is_exchange
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        saleId,
        line.productId,
        line.quantity,
        line.unitPrice ?? 0,
        line.discountAmount ?? 0,
        line.taxAmount ?? 0,
        line.lineTotal ?? 0,
        line.isExchange ?? false,
      ],
    )
  }
}

async function applyLedgerLines(client, tenantId, syncEvent, payload, movementType, userId) {
  const reason =
    payload.reason ||
    (syncEvent.eventType === 'sale' ? 'POS sale' : 'POS refund')
  const branchId = syncEvent.branchId || null
  const ledgerLines = []

  for (const line of payload.lines) {
    ledgerLines.push(
      await insertLedgerEventInTx(client, tenantId, {
        productId: line.productId,
        movementType,
        quantity: line.quantity,
        scale: line.scale || 'unit',
        reason,
        posEventId: syncEvent.id,
        branchId,
        createdBy: userId,
      }),
    )
  }

  return ledgerLines
}

export async function ingestSaleEvent(client, tenantId, syncEvent, userId) {
  const parsed = validateSalePayload(syncEvent.payload)
  if (!parsed.success) {
    throw httpError(422, 'Sale events require a valid payload with lines')
  }

  if (await eventAlreadyProcessed(client, tenantId, syncEvent.id)) {
    return {
      clientEventId: syncEvent.clientEventId,
      skipped: true,
      saleId: null,
    }
  }

  const branchId = syncEvent.branchId
  if (!branchId) {
    throw httpError(422, 'Sale events require branchId on the sync token')
  }

  const payload = parsed.data
  const counterId = await upsertPosCounter(client, tenantId, branchId, payload.counterCode)
  const staffId = await resolveStaffId(client, tenantId, payload.staffUserId, branchId)

  const salePayload = {
    ...payload,
    status: payload.status || 'completed',
  }

  const saleId = await insertSaleInTx(client, tenantId, {
    branchId,
    counterId,
    payload: salePayload,
    staffId,
    posEventId: syncEvent.id,
  })

  await insertSaleItemsInTx(client, tenantId, saleId, payload.lines)
  await applyLedgerLines(client, tenantId, syncEvent, payload, MOVEMENT_TYPES.OUT, userId)

  return {
    clientEventId: syncEvent.clientEventId,
    skipped: false,
    saleId,
  }
}

export async function ingestRefundEvent(client, tenantId, syncEvent, userId) {
  const parsed = validateRefundPayload(syncEvent.payload)
  if (!parsed.success) {
    throw httpError(422, 'Refund events require a valid payload with lines')
  }

  if (await eventAlreadyProcessed(client, tenantId, syncEvent.id)) {
    return {
      clientEventId: syncEvent.clientEventId,
      skipped: true,
      saleId: null,
    }
  }

  const branchId = syncEvent.branchId
  if (!branchId) {
    throw httpError(422, 'Refund events require branchId on the sync token')
  }

  const payload = parsed.data
  const counterId = await upsertPosCounter(client, tenantId, branchId, payload.counterCode)
  const staffId = await resolveStaffId(client, tenantId, payload.staffUserId, branchId)

  const salePayload = {
    ...payload,
    status: payload.status || 'refunded',
  }

  const saleId = await insertSaleInTx(client, tenantId, {
    branchId,
    counterId,
    payload: salePayload,
    staffId,
    posEventId: syncEvent.id,
  })

  await insertSaleItemsInTx(client, tenantId, saleId, payload.lines)
  await applyLedgerLines(client, tenantId, syncEvent, payload, MOVEMENT_TYPES.IN, userId)

  return {
    clientEventId: syncEvent.clientEventId,
    skipped: false,
    saleId,
  }
}

/**
 * POS Items Rate → cloud products.selling_price (Policy A: branch-scoped product row).
 * Final Price is derived on read (selling × discount × offer × tax) — no stored final column.
 */
export async function ingestProductPriceUpdate(client, tenantId, syncEvent) {
  const parsed = validateProductPricePayload(syncEvent.payload)
  if (!parsed.success) {
    throw httpError(422, 'product_price_update requires productId and sellingPrice')
  }

  const branchId = syncEvent.branchId
  if (!branchId) {
    throw httpError(422, 'product_price_update requires branchId on the sync token')
  }

  const payload = parsed.data
  if (payload.branchId && payload.branchId !== branchId) {
    throw httpError(403, 'Branch access denied for product price update')
  }

  // Idempotent replay of the same clientEventId
  if (!syncEvent.inserted) {
    return {
      clientEventId: syncEvent.clientEventId,
      skipped: true,
      saleId: null,
      productId: payload.productId,
      sellingPrice: payload.sellingPrice,
      reason: 'duplicate_client_event_id',
    }
  }

  const { rows: existingRows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT
        id,
        selling_price AS "sellingPrice",
        discount_percent AS "discountPercent",
        branch_id AS "branchId",
        updated_at AS "updatedAt"
      FROM products
      WHERE tenant_id = $1
        AND id = $2
        AND branch_id = $3
      LIMIT 1
    `,
    [payload.productId, branchId],
  )

  const product = existingRows[0]
  if (!product) {
    throw httpError(404, 'Product not found for this branch')
  }

  // Optional stale guard: cloud newer than POS timestamp → skip overwrite
  if (payload.updatedAt && product.updatedAt) {
    const posTs = Date.parse(payload.updatedAt)
    const cloudTs = new Date(product.updatedAt).getTime()
    if (Number.isFinite(posTs) && Number.isFinite(cloudTs) && cloudTs > posTs) {
      return {
        clientEventId: syncEvent.clientEventId,
        skipped: true,
        saleId: null,
        productId: product.id,
        sellingPrice: Number(product.sellingPrice),
        reason: 'stale_pos_updated_at',
      }
    }
  }

  const nextDiscount =
    payload.discountPercent !== undefined ? payload.discountPercent : product.discountPercent

  const { rows: updatedRows } = await tenantClientQuery(
    client,
    tenantId,
    `
      UPDATE products
      SET
        last_selling_price = CASE
          WHEN selling_price IS DISTINCT FROM $4::numeric THEN selling_price
          ELSE last_selling_price
        END,
        selling_price = $4::numeric,
        discount_percent = $5::numeric,
        updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
        AND branch_id = $3
      RETURNING
        id AS "productId",
        selling_price AS "sellingPrice",
        discount_percent AS "discountPercent",
        updated_at AS "updatedAt"
    `,
    [payload.productId, branchId, payload.sellingPrice, nextDiscount],
  )

  const updated = updatedRows[0]
  if (!updated) {
    throw httpError(404, 'Product not found for this branch')
  }

  return {
    clientEventId: syncEvent.clientEventId,
    skipped: false,
    saleId: null,
    productId: updated.productId,
    sellingPrice: Number(updated.sellingPrice),
    discountPercent:
      updated.discountPercent === null || updated.discountPercent === undefined
        ? null
        : Number(updated.discountPercent),
    updatedAt: updated.updatedAt,
  }
}

export async function ingestSyncEvent(tenantId, event, userId) {
  return withTransaction(async (client) => {
    const syncEvent = await insertSyncEventInTx(client, tenantId, event)
    if (!syncEvent) {
      throw httpError(500, 'Failed to store sync event')
    }

    if (event.eventType === 'sale') {
      return ingestSaleEvent(client, tenantId, syncEvent, userId)
    }
    if (event.eventType === 'refund') {
      return ingestRefundEvent(client, tenantId, syncEvent, userId)
    }
    if (event.eventType === 'product_price_update' || event.eventType === 'price_change') {
      return ingestProductPriceUpdate(client, tenantId, syncEvent)
    }

    // cashier_log / attendance — pos_sync_events only (Phase 1)
    return {
      clientEventId: syncEvent.clientEventId,
      skipped: false,
      saleId: null,
    }
  })
}

export async function listSyncEvents(tenantId, { since } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        id,
        event_type AS "eventType",
        payload,
        client_event_id AS "clientEventId",
        created_at AS "createdAt"
      FROM pos_sync_events
      WHERE tenant_id = $1
        AND ($2::timestamptz IS NULL OR created_at > $2::timestamptz)
      ORDER BY created_at ASC
    `,
    [since || null],
  )
  return rows
}

// ---------------------------------------------------------------------------
// Bootstrap / Delta snapshots
// ---------------------------------------------------------------------------

async function fetchBootstrapUsers(tenantId, branchId, since = null) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        u.id,
        u.email AS "loginId",
        u.password_hash AS "passwordHash",
        r.slug AS role,
        u.full_name AS "fullName",
        u.branch_id AS "branchId",
        u.tenant_id AS "tenantId",
        u.is_active AS "isActive"
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.tenant_id = $1
        AND u.branch_id = $2
        AND r.slug IN ($3, $4)
        AND ($5::timestamptz IS NULL OR u.created_at > $5::timestamptz)
        AND ($5::timestamptz IS NOT NULL OR u.is_active = true)
      ORDER BY u.full_name
    `,
    [branchId, ROLES.BRANCH_MANAGER, ROLES.CASHIER, since],
  )
  return rows
}

async function fetchBootstrapCategories(tenantId, branchId, since = null) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        id,
        parent_id AS "parentId",
        name,
        image_url AS "imageUrl",
        is_active AS "isActive",
        branch_id AS "branchId"
      FROM categories
      WHERE tenant_id = $1
        AND branch_id = $2
        AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)
        AND ($3::timestamptz IS NOT NULL OR is_active = true)
      ORDER BY name
    `,
    [branchId, since],
  )
  return rows.map((row) => ({
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }))
}

async function fetchBootstrapProducts(tenantId, branchId, since = null) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        p.id,
        p.name,
        p.item_code AS "itemCode",
        p.barcode,
        p.type,
        p.scale,
        p.selling_price AS "sellingPrice",
        p.discount_percent AS "discountPercent",
        p.status,
        p.image_url AS "imageUrl",
        p.description,
        p.category_id AS "categoryId",
        p.subcategory_id AS "subcategoryId",
        p.branch_id AS "branchId",
        p.offer_id AS "offerId",
        p.updated_at AS "updatedAt"
      FROM products p
      WHERE p.tenant_id = $1
        AND p.branch_id = $2
        AND (
          $3::timestamptz IS NULL
          OR p.created_at > $3::timestamptz
          OR p.updated_at > $3::timestamptz
        )
        AND ($3::timestamptz IS NOT NULL OR p.status = 'active')
      ORDER BY p.name
    `,
    [branchId, since],
  )
  return rows.map((row) => ({
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }))
}

async function fetchProductTaxMap(tenantId, productIds) {
  if (!productIds.length) return new Map()
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT product_id AS "productId", tax_id AS "taxId"
      FROM product_taxes
      WHERE tenant_id = $1 AND product_id = ANY($2::uuid[])
    `,
    [productIds],
  )
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.productId)) map.set(row.productId, [])
    map.get(row.productId).push(row.taxId)
  }
  return map
}

async function fetchBundleItemsMap(tenantId, bundleIds) {
  if (!bundleIds.length) return new Map()
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        bundle_id AS "bundleId",
        item_id AS "itemId",
        quantity
      FROM bundle_items
      WHERE tenant_id = $1 AND bundle_id = ANY($2::uuid[])
    `,
    [bundleIds],
  )
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.bundleId)) map.set(row.bundleId, [])
    map.get(row.bundleId).push({ itemId: row.itemId, quantity: Number(row.quantity) })
  }
  return map
}

async function attachProductExtras(tenantId, products) {
  const productIds = products.map((p) => p.id)
  const bundleIds = products.filter((p) => p.type === 'bundle').map((p) => p.id)
  const [taxMap, bundleMap] = await Promise.all([
    fetchProductTaxMap(tenantId, productIds),
    fetchBundleItemsMap(tenantId, bundleIds),
  ])

  return products.map((p) => ({
    ...p,
    taxIds: taxMap.get(p.id) || [],
    bundleItems: bundleMap.get(p.id) || [],
  }))
}

async function fetchTaxes(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT id, name, rate_percent AS "ratePercent" FROM taxes WHERE tenant_id = $1 ORDER BY name`,
  )
  return rows
}

async function fetchOffers(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT id, name, percent FROM offers WHERE tenant_id = $1 ORDER BY name`,
  )
  return rows
}

async function fetchBranchInventory(tenantId, branchId, since = null) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT product_id AS "productId", quantity
      FROM branch_inventory
      WHERE tenant_id = $1
        AND branch_id = $2
        AND ($3::timestamptz IS NULL OR updated_at > $3::timestamptz)
      ORDER BY product_id
    `,
    [branchId, since],
  )
  return rows
}

async function fetchCounters(tenantId, branchId, since = null) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, code, name, is_active AS "isActive"
      FROM pos_counters
      WHERE tenant_id = $1
        AND branch_id = $2
        AND is_active = true
        AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)
      ORDER BY code
    `,
    [branchId, since],
  )
  return rows
}

async function fetchTenantBranchMeta(tenantId, branchId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        t.id AS "tenantId",
        t.name AS "tenantName",
        t.slug AS "tenantSlug",
        b.id AS "branchId",
        b.name AS "branchName"
      FROM tenants t
      JOIN branches b ON b.tenant_id = t.id AND b.id = $2
      WHERE t.id = $1
      LIMIT 1
    `,
    [branchId],
  )
  return rows[0] || null
}

async function buildSnapshotSections(tenantId, branchId, since = null) {
  const [users, categories, rawProducts, branchInventory, counters, taxes, offers] =
    await Promise.all([
      fetchBootstrapUsers(tenantId, branchId, since),
      fetchBootstrapCategories(tenantId, branchId, since),
      fetchBootstrapProducts(tenantId, branchId, since),
      fetchBranchInventory(tenantId, branchId, since),
      fetchCounters(tenantId, branchId, since),
      fetchTaxes(tenantId),
      fetchOffers(tenantId),
    ])

  const products = await attachProductExtras(tenantId, rawProducts)

  return {
    users,
    categories,
    products,
    taxes,
    offers,
    branchInventory,
    counters,
  }
}

export async function buildBootstrapSnapshot(tenantId, branchId) {
  const meta = await fetchTenantBranchMeta(tenantId, branchId)
  if (!meta) {
    throw httpError(404, 'Branch not found')
  }

  const sections = await buildSnapshotSections(tenantId, branchId, null)

  return {
    syncVersion: new Date().toISOString(),
    tenant: { id: meta.tenantId, name: meta.tenantName, slug: meta.tenantSlug },
    branch: { id: meta.branchId, name: meta.branchName },
    ...sections,
    company: {
      name: meta.tenantName,
      contactPhone: null,
      warningMessage: null,
      returnInstructions: null,
    },
  }
}

export async function buildDeltaSnapshot(tenantId, branchId, since) {
  const meta = await fetchTenantBranchMeta(tenantId, branchId)
  if (!meta) {
    throw httpError(404, 'Branch not found')
  }

  const sections = await buildSnapshotSections(tenantId, branchId, since)

  return {
    syncVersion: new Date().toISOString(),
    tenant: { id: meta.tenantId, name: meta.tenantName, slug: meta.tenantSlug },
    branch: { id: meta.branchId, name: meta.branchName },
    ...sections,
    company: {
      name: meta.tenantName,
      contactPhone: null,
      warningMessage: null,
      returnInstructions: null,
    },
  }
}
