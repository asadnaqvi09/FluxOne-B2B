import { tenantQuery } from '../../../config/db.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function mapOffer(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    percent: Number(row.percent),
    categoryId: row.categoryId || null,
    categoryName: row.categoryName || null,
  }
}

export async function createOffer(tenantId, { name, percent, categoryId }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      INSERT INTO offers (tenant_id, name, percent, category_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, percent, category_id AS "categoryId"
    `,
    [name.trim(), parseFloat(percent), categoryId || null],
  )
  return getOfferById(tenantId, rows[0].id)
}

export async function listOffers(tenantId, { categoryId } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        o.id,
        o.name,
        o.percent,
        o.category_id AS "categoryId",
        c.name AS "categoryName"
      FROM offers o
      LEFT JOIN categories c
        ON c.id = o.category_id
       AND c.tenant_id = o.tenant_id
      WHERE o.tenant_id = $1
        AND ($2::uuid IS NULL OR o.category_id = $2)
      ORDER BY o.name ASC
    `,
    [categoryId || null],
  )
  return rows.map(mapOffer)
}

export async function getOfferById(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        o.id,
        o.name,
        o.percent,
        o.category_id AS "categoryId",
        c.name AS "categoryName"
      FROM offers o
      LEFT JOIN categories c
        ON c.id = o.category_id
       AND c.tenant_id = o.tenant_id
      WHERE o.tenant_id = $1 AND o.id = $2
      LIMIT 1
    `,
    [id],
  )
  return mapOffer(rows[0])
}

export async function updateOffer(tenantId, id, { name, percent, categoryId }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE offers
      SET name = $2,
          percent = $3,
          category_id = $4
      WHERE tenant_id = $1 AND id = $5
      RETURNING id
    `,
    [name.trim(), parseFloat(percent), categoryId || null, id],
  )
  if (!rows[0]) return null
  return getOfferById(tenantId, id)
}

export async function deleteOffer(tenantId, id) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT id FROM products WHERE tenant_id = $1 AND offer_id = $2 LIMIT 1`,
    [id],
  )
  if (rows.length > 0) {
    throw httpError(
      409,
      'This discount is currently assigned to one or more active products and cannot be deleted.',
    )
  }

  const { rowCount } = await tenantQuery(
    tenantId,
    `DELETE FROM offers WHERE tenant_id = $1 AND id = $2`,
    [id],
  )
  return rowCount > 0
}
