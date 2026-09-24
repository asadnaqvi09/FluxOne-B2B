import { tenantClientQuery, tenantQuery, withTransaction } from '../../../config/db.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'

const SALES_WINDOW_DAYS = 30

function mapProductRow(row) {
  if (!row) return null
  const baseCost = Number(row.baseCost) || 0
  const profitPct = Number(row.profitPct) || 0
  const taxPct = Number(row.taxPct) || 0
  // Admin Tax & Profit formula: cost + profit-on-cost + tax-on-cost
  const finalPrice = Math.round(baseCost + (baseCost * profitPct) / 100 + (baseCost * taxPct) / 100)

  return {
    id: row.id,
    itemCode: row.itemCode || '',
    name: row.name || '',
    image: normalizeImageUrl(row.imageUrl) || row.imageUrl || '',
    barcode: row.barcode || '',
    categoryId: row.categoryId || null,
    category: row.categoryName || '',
    subcategoryId: row.subcategoryId || null,
    subcategory: row.subcategoryName || '',
    scale: row.scale || '',
    scaleLabel: row.scale || '',
    branchId: row.branchId || null,
    branchName: row.branchName || '',
    baseCost,
    profitPct,
    taxPct,
    salesVolume30D: Number(row.salesVolume30D) || 0,
    finalPrice,
    status: row.status || 'open',
  }
}

function sortClause(sort) {
  switch (sort) {
    case 'top_sales':
      return 'COALESCE(sales.qty_30d, 0) DESC, p.name ASC'
    case 'top_profit':
      return 'p.profit_percent DESC, p.name ASC'
    case 'slow_moving':
      return 'COALESCE(sales.qty_30d, 0) ASC, p.name ASC'
    default:
      return 'p.created_at DESC, p.name ASC'
  }
}

export async function listTaxProfitProducts(tenantId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 8))
  const offset = (page - 1) * limit
  const q = filters.q?.trim() || null
  const categoryId = filters.categoryId || null
  const subcategoryId = filters.subcategoryId || null
  const scale = filters.scale && filters.scale !== 'All Scales' ? filters.scale.trim() : null
  const sort = filters.sort || 'all'

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        p.id,
        p.item_code AS "itemCode",
        p.name,
        p.image_url AS "imageUrl",
        p.barcode,
        p.scale,
        p.status,
        p.branch_id AS "branchId",
        b.name AS "branchName",
        p.category_id AS "categoryId",
        c.name AS "categoryName",
        p.subcategory_id AS "subcategoryId",
        sc.name AS "subcategoryName",
        p.purchase_price AS "baseCost",
        COALESCE(p.profit_percent, 0) AS "profitPct",
        COALESCE(tax.tax_percent, 0) AS "taxPct",
        COALESCE(sales.qty_30d, 0) AS "salesVolume30D",
        count(*) OVER()::int AS "_total"
      FROM products p
      LEFT JOIN branches b ON b.id = p.branch_id AND b.tenant_id = p.tenant_id
      LEFT JOIN categories c ON c.id = p.category_id AND c.tenant_id = p.tenant_id
      LEFT JOIN categories sc ON sc.id = p.subcategory_id AND sc.tenant_id = p.tenant_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(t.rate_percent), 0) AS tax_percent
        FROM product_taxes pt
        JOIN taxes t ON t.id = pt.tax_id AND t.tenant_id = p.tenant_id
        WHERE pt.tenant_id = p.tenant_id AND pt.product_id = p.id
      ) tax ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(si.quantity), 0)::numeric AS qty_30d
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
        WHERE si.tenant_id = p.tenant_id
          AND si.product_id = p.id
          AND s.status IN ('completed', 'partial_refund')
          AND s.sold_at >= now() - ($7::int * INTERVAL '1 day')
      ) sales ON true
      WHERE p.tenant_id = $1
        AND (
          $2::text IS NULL
          OR p.name ILIKE '%' || $2 || '%'
          OR p.item_code ILIKE '%' || $2 || '%'
          OR p.barcode ILIKE '%' || $2 || '%'
          OR p.id::text ILIKE '%' || $2 || '%'
        )
        AND ($3::uuid IS NULL OR p.category_id = $3)
        AND ($4::uuid IS NULL OR p.subcategory_id = $4)
        AND ($5::text IS NULL OR p.scale = $5)
      ORDER BY ${sortClause(sort)}
      LIMIT $6 OFFSET $8
    `,
    [q, categoryId, subcategoryId, scale, limit, SALES_WINDOW_DAYS, offset],
  )

  const total = rows[0]?._total || 0
  const items = rows.map(({ _total, ...row }) => mapProductRow(row))
  return { items, total, page, limit }
}

export async function getTaxProfitMeta(tenantId) {
  const [{ rows: categoryRows }, { rows: scaleRows }, { rows: taxRows }, { rows: tenantRows }] =
    await Promise.all([
      tenantQuery(
        tenantId,
        `
          SELECT
            id,
            name,
            parent_id AS "parentId"
          FROM categories
          WHERE tenant_id = $1
            AND COALESCE(is_active, true) = true
          ORDER BY name ASC
        `,
      ),
      tenantQuery(
        tenantId,
        `
          SELECT DISTINCT scale
          FROM products
          WHERE tenant_id = $1
            AND scale IS NOT NULL
            AND trim(scale) <> ''
          ORDER BY scale ASC
        `,
      ),
      tenantQuery(
        tenantId,
        `
          SELECT
            id,
            name,
            rate_percent AS "ratePercent"
          FROM taxes
          WHERE tenant_id = $1
          ORDER BY rate_percent ASC, name ASC
        `,
      ),
      tenantQuery(
        tenantId,
        `
          SELECT
            COALESCE(default_profit_percent, 0) AS "defaultProfitPercent",
            COALESCE(default_tax_percent, 0) AS "defaultTaxPercent"
          FROM tenants
          WHERE id = $1
          LIMIT 1
        `,
      ),
    ])

  const parents = categoryRows.filter((c) => !c.parentId)
  const childrenByParent = new Map()
  for (const row of categoryRows) {
    if (!row.parentId) continue
    const list = childrenByParent.get(row.parentId) || []
    list.push({ id: row.id, name: row.name })
    childrenByParent.set(row.parentId, list)
  }

  const tenantDef = tenantRows[0] || {}

  return {
    categories: parents.map((p) => ({
      id: p.id,
      name: p.name,
      children: childrenByParent.get(p.id) || [],
    })),
    scales: scaleRows.map((r) => r.scale),
    taxes: taxRows.map((t) => ({
      id: t.id,
      name: t.name,
      ratePercent: Number(t.ratePercent) || 0,
    })),
    defaults: {
      defaultProfitPercent: Number(tenantDef.defaultProfitPercent) || 0,
      defaultTaxPercent: Number(tenantDef.defaultTaxPercent) || 0,
    },
  }
}

export async function updateTaxProfitDefaults(tenantId, { defaultProfitPercent, defaultTaxPercent, applyToAllProducts = false }) {
  return withTransaction(async (client) => {
    const setClauses = []
    const params = []

    if (defaultProfitPercent !== undefined) {
      params.push(Number(defaultProfitPercent))
      setClauses.push(`default_profit_percent = $${params.length + 1}::numeric`)
    }
    if (defaultTaxPercent !== undefined) {
      params.push(Number(defaultTaxPercent))
      setClauses.push(`default_tax_percent = $${params.length + 1}::numeric`)
    }

    if (setClauses.length > 0) {
      await tenantClientQuery(
        client,
        tenantId,
        `
          UPDATE tenants
          SET ${setClauses.join(', ')}
          WHERE id = $1
        `,
        params,
      )
    }

    let updatedProductsCount = 0

    if (applyToAllProducts) {
      // 1. Apply default profit percentage to all products if specified
      if (defaultProfitPercent !== undefined) {
        const profitRate = Number(defaultProfitPercent)
        const { rowCount } = await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE products
            SET
              profit_percent = $2::numeric,
              selling_price = ROUND(purchase_price * (1 + ($2::numeric / 100)), 2),
              updated_at = now()
            WHERE tenant_id = $1
          `,
          [profitRate],
        )
        updatedProductsCount = rowCount || 0
      }

      // 2. Apply default tax percentage to all products if specified
      if (defaultTaxPercent !== undefined) {
        const taxRate = Number(defaultTaxPercent)

        // Clear all existing product tax links
        await tenantClientQuery(
          client,
          tenantId,
          `DELETE FROM product_taxes WHERE tenant_id = $1`,
        )

        // If taxRate > 0, find or create tax and assign to all products of tenant
        if (taxRate > 0) {
          const taxId = await findOrCreateTaxByRate(client, tenantId, taxRate)
          await tenantClientQuery(
            client,
            tenantId,
            `
              INSERT INTO product_taxes (tenant_id, product_id, tax_id)
              SELECT $1, p.id, $2::uuid
              FROM products p
              WHERE p.tenant_id = $1
              ON CONFLICT DO NOTHING
            `,
            [taxId],
          )
        }
      }
    }

    const { rows: updatedTenant } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT
          COALESCE(default_profit_percent, 0) AS "defaultProfitPercent",
          COALESCE(default_tax_percent, 0) AS "defaultTaxPercent"
        FROM tenants
        WHERE id = $1
      `,
    )

    const row = updatedTenant[0] || {}
    return {
      defaultProfitPercent: Number(row.defaultProfitPercent) || 0,
      defaultTaxPercent: Number(row.defaultTaxPercent) || 0,
      appliedToAll: Boolean(applyToAllProducts),
      updatedCount: updatedProductsCount,
    }
  })
}

async function assertProductsBelongToTenant(client, tenantId, productIds) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id
      FROM products
      WHERE tenant_id = $1
        AND id = ANY($2::uuid[])
    `,
    [productIds],
  )
  if (rows.length !== productIds.length) {
    const error = new Error('One or more products were not found in this company')
    error.status = 404
    throw error
  }
}

export async function bulkSetProfitPercent(tenantId, productIds, profitPercent) {
  const uniqueIds = [...new Set(productIds)]
  const rate = Number(profitPercent)

  return withTransaction(async (client) => {
    await assertProductsBelongToTenant(client, tenantId, uniqueIds)

    const { rowCount } = await tenantClientQuery(
      client,
      tenantId,
      `
        UPDATE products
        SET
          profit_percent = $2::numeric,
          selling_price = ROUND(purchase_price * (1 + ($2::numeric / 100)), 2),
          updated_at = now()
        WHERE tenant_id = $1
          AND id = ANY($3::uuid[])
      `,
      [rate, uniqueIds],
    )

    return { updated: rowCount || 0, profitPercent: rate }
  })
}

async function findOrCreateTaxByRate(client, tenantId, taxPercent) {
  const rate = Number(taxPercent)
  const { rows: existing } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id
      FROM taxes
      WHERE tenant_id = $1
        AND rate_percent = $2::numeric
      ORDER BY name ASC, id ASC
      LIMIT 1
    `,
    [rate],
  )
  if (existing[0]?.id) return existing[0].id

  const { rows: created } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO taxes (tenant_id, name, rate_percent)
      VALUES ($1, $2, $3::numeric)
      RETURNING id
    `,
    [`Sales Tax ${rate}%`, rate],
  )
  return created[0].id
}

export async function bulkSetTaxPercent(tenantId, productIds, taxPercent) {
  const uniqueIds = [...new Set(productIds)]
  const rate = Number(taxPercent)

  return withTransaction(async (client) => {
    await assertProductsBelongToTenant(client, tenantId, uniqueIds)

    // Clear existing tax links for selected products
    await tenantClientQuery(
      client,
      tenantId,
      `
        DELETE FROM product_taxes
        WHERE tenant_id = $1
          AND product_id = ANY($2::uuid[])
      `,
      [uniqueIds],
    )

    // 0% = tax-exempt (no product_taxes rows)
    if (rate === 0) {
      return { updated: uniqueIds.length, taxPercent: rate }
    }

    const taxId = await findOrCreateTaxByRate(client, tenantId, rate)

    await tenantClientQuery(
      client,
      tenantId,
      `
        INSERT INTO product_taxes (tenant_id, product_id, tax_id)
        SELECT $1, x.product_id, $2::uuid
        FROM unnest($3::uuid[]) AS x(product_id)
        ON CONFLICT DO NOTHING
      `,
      [taxId, uniqueIds],
    )

    return { updated: uniqueIds.length, taxPercent: rate }
  })
}
