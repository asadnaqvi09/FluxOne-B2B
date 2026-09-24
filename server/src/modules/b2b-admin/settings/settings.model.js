import { tenantQuery } from '../../../config/db.js'
import {
  DEFAULT_CURRENCY,
  normalizeCurrency,
  SUPPORTED_CURRENCIES,
} from '../../../utils/currency.util.js'

function mapDeviceRow(row) {
  if (!row) return null
  return {
    id: row.id,
    deviceName: row.deviceName || '',
    hardwareSignature: row.hardwareSignature || '',
    ipAddress: row.ipAddress || '',
    macAddress: row.macAddress || '',
    userId: row.userEmail || '',
    userName: row.userName || 'Unassigned',
    branchId: row.branchId || null,
    branch: row.branchName || 'Unassigned',
    status: row.status === 'blocked' ? 'blocked' : 'active',
    lastActiveAt: row.lastActiveAt || null,
    createdAt: row.createdAt || null,
  }
}

export async function listDevices(tenantId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 6))
  const offset = (page - 1) * limit
  const q = filters.q?.trim() || null
  const status =
    filters.status && filters.status !== 'all' ? filters.status : null

  const { rows: statsRows } = await tenantQuery(
    tenantId,
    `
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'active')::int AS active,
        count(*) FILTER (WHERE status = 'blocked')::int AS blocked
      FROM hardware_devices
      WHERE tenant_id = $1
    `,
  )

  const { rows: countRows } = await tenantQuery(
    tenantId,
    `
      SELECT count(*)::int AS total
      FROM hardware_devices d
      LEFT JOIN branches b ON b.id = d.branch_id AND b.tenant_id = d.tenant_id
      LEFT JOIN users u ON u.id = d.user_id AND u.tenant_id = d.tenant_id
      WHERE d.tenant_id = $1
        AND ($2::text IS NULL OR d.status = $2)
        AND (
          $3::text IS NULL
          OR d.device_name ILIKE '%' || $3 || '%'
          OR d.hardware_signature ILIKE '%' || $3 || '%'
          OR COALESCE(d.ip_address, '') ILIKE '%' || $3 || '%'
          OR COALESCE(d.mac_address, '') ILIKE '%' || $3 || '%'
          OR COALESCE(b.name, '') ILIKE '%' || $3 || '%'
          OR COALESCE(u.full_name, '') ILIKE '%' || $3 || '%'
          OR COALESCE(u.email, '') ILIKE '%' || $3 || '%'
        )
    `,
    [status, q],
  )

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        d.id,
        d.device_name AS "deviceName",
        d.hardware_signature AS "hardwareSignature",
        d.ip_address AS "ipAddress",
        d.mac_address AS "macAddress",
        d.branch_id AS "branchId",
        b.name AS "branchName",
        u.email AS "userEmail",
        u.full_name AS "userName",
        d.status,
        d.last_active_at AS "lastActiveAt",
        d.created_at AS "createdAt"
      FROM hardware_devices d
      LEFT JOIN branches b ON b.id = d.branch_id AND b.tenant_id = d.tenant_id
      LEFT JOIN users u ON u.id = d.user_id AND u.tenant_id = d.tenant_id
      WHERE d.tenant_id = $1
        AND ($2::text IS NULL OR d.status = $2)
        AND (
          $3::text IS NULL
          OR d.device_name ILIKE '%' || $3 || '%'
          OR d.hardware_signature ILIKE '%' || $3 || '%'
          OR COALESCE(d.ip_address, '') ILIKE '%' || $3 || '%'
          OR COALESCE(d.mac_address, '') ILIKE '%' || $3 || '%'
          OR COALESCE(b.name, '') ILIKE '%' || $3 || '%'
          OR COALESCE(u.full_name, '') ILIKE '%' || $3 || '%'
          OR COALESCE(u.email, '') ILIKE '%' || $3 || '%'
        )
      ORDER BY
        CASE WHEN d.status = 'active' THEN 0 ELSE 1 END,
        d.last_active_at DESC NULLS LAST,
        d.device_name ASC
      LIMIT $4 OFFSET $5
    `,
    [status, q, limit, offset],
  )

  const stats = statsRows[0] || { total: 0, active: 0, blocked: 0 }
  return {
    items: rows.map(mapDeviceRow),
    total: countRows[0]?.total || 0,
    active: stats.active || 0,
    blocked: stats.blocked || 0,
    registered: stats.total || 0,
    page,
    limit,
  }
}

export async function updateDeviceStatus(tenantId, id, status) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE hardware_devices
      SET
        status = $2,
        updated_at = now()
      WHERE tenant_id = $1
        AND id = $3
      RETURNING
        id,
        device_name AS "deviceName",
        hardware_signature AS "hardwareSignature",
        ip_address AS "ipAddress",
        mac_address AS "macAddress",
        branch_id AS "branchId",
        NULL::text AS "branchName",
        NULL::text AS "userEmail",
        NULL::text AS "userName",
        status,
        last_active_at AS "lastActiveAt",
        created_at AS "createdAt"
    `,
    [status, id],
  )

  if (!rows[0]) {
    const error = new Error('Device not found')
    error.status = 404
    throw error
  }

  // Re-fetch with joins for response shape
  const { rows: full } = await tenantQuery(
    tenantId,
    `
      SELECT
        d.id,
        d.device_name AS "deviceName",
        d.hardware_signature AS "hardwareSignature",
        d.ip_address AS "ipAddress",
        d.mac_address AS "macAddress",
        d.branch_id AS "branchId",
        b.name AS "branchName",
        u.email AS "userEmail",
        u.full_name AS "userName",
        d.status,
        d.last_active_at AS "lastActiveAt",
        d.created_at AS "createdAt"
      FROM hardware_devices d
      LEFT JOIN branches b ON b.id = d.branch_id AND b.tenant_id = d.tenant_id
      LEFT JOIN users u ON u.id = d.user_id AND u.tenant_id = d.tenant_id
      WHERE d.tenant_id = $1 AND d.id = $2
      LIMIT 1
    `,
    [id],
  )

  return mapDeviceRow(full[0] || rows[0])
}

// Tenant default currency (display default across the company)
export async function getCurrencySettings(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT COALESCE(default_currency, $2) AS "defaultCurrency"
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `,
    [DEFAULT_CURRENCY],
  )

  return {
    defaultCurrency: normalizeCurrency(rows[0]?.defaultCurrency || DEFAULT_CURRENCY),
    options: SUPPORTED_CURRENCIES,
  }
}

export async function updateCurrencySettings(tenantId, currencyCode) {
  const code = normalizeCurrency(currencyCode)

  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE tenants
      SET default_currency = $2
      WHERE id = $1
      RETURNING COALESCE(default_currency, $3) AS "defaultCurrency"
    `,
    [code, DEFAULT_CURRENCY],
  )

  if (!rows[0]) {
    const error = new Error('Company not found')
    error.status = 404
    throw error
  }

  return {
    defaultCurrency: normalizeCurrency(rows[0].defaultCurrency),
    options: SUPPORTED_CURRENCIES,
  }
}
