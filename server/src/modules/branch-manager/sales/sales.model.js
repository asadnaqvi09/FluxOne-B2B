import { tenantQuery } from '../../../config/db.js'

export async function listSales(tenantId, filters = {}) {
  let query = `
    SELECT 
      s.id,
      s.sale_number AS "saleNumber",
      s.sold_at AS "soldAt",
      s.subtotal,
      s.tax_amount AS "taxAmount",
      s.discount_amount AS "discountAmount",
      s.final_amount AS "finalAmount",
      s.paid_amount AS "paidAmount",
      s.return_amount AS "returnAmount",
      s.status,
      COALESCE(s.currency, 'PKR') AS currency,
      COALESCE(
        json_agg(
          json_build_object(
            'id', si.id,
            'name', p.name,
            'quantity', si.quantity,
            'unitPrice', si.unit_price,
            'lineTotal', si.line_total,
            'isExchange', si.is_exchange
          )
        ) FILTER (WHERE si.id IS NOT NULL),
        '[]'
      ) AS "items"
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id AND si.tenant_id = s.tenant_id
    LEFT JOIN products p ON p.id = si.product_id AND p.tenant_id = si.tenant_id
    WHERE s.tenant_id = $1
  `
  const params = []
  if (filters.branchId) {
    params.push(filters.branchId)
    query += ` AND s.branch_id = $${params.length + 1}`
  }
  if (filters.q) {
    params.push(`%${filters.q.trim()}%`)
    const idx = params.length + 1  // +1 kyunki $1 hamesha tenant_id hai
    query += ` AND (s.sale_number ILIKE $${idx} OR s.id::text ILIKE $${idx})`
  }
  if (filters.date) {
    params.push(filters.date)
    query += ` AND s.sold_at::date = $${params.length + 1}::date`
  }
  if (filters.category_id) {
    params.push(filters.category_id)
    query += ` AND s.id IN (
  SELECT DISTINCT sale_id
  FROM sale_items si2
  JOIN products p2 ON p2.id = si2.product_id
  WHERE p2.category_id = $${params.length + 1}
)`
  }

  query += ` GROUP BY s.id ORDER BY s.sold_at DESC`

  const { rows } = await tenantQuery(tenantId, query, params)
  return rows
}

export async function refundSale(tenantId, saleId, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE sales
      SET status = 'refunded', return_amount = final_amount
      WHERE tenant_id = $1 AND id = $2 AND status != 'refunded'
        AND ($3::uuid IS NULL OR branch_id = $3)
      RETURNING id, status, final_amount AS "refundedAmount"
    `,
    [saleId, branchId],
  )
  return rows[0]
}
