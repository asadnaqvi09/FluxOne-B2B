import { tenantClientQuery, tenantQuery, withTransaction } from '../../../config/db.js'
import { PRODUCT_TYPES } from '../../../config/constants.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// Branch scope: null = all branches (B2B admin)
function branchClause(alias, paramIndex) {
  const col = alias ? `${alias}.branch_id` : 'branch_id'
  return `AND ($${paramIndex}::uuid IS NULL OR ${col} = $${paramIndex})`
}

export async function listCategories(tenantId, { active = 'active', branchId = null } = {}) {
  const activeClause =
    active === 'all'
      ? ''
      : active === 'inactive'
        ? 'AND is_active = false'
        : 'AND is_active = true'

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
        branch_id AS "branchId"
      FROM categories
      WHERE tenant_id = $1
        ${branchClause('', 2)}
        ${activeClause}
      ORDER BY name
    `,
    [branchId],
  )
  return rows.map((row) => ({
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }))
}

function mapCategoryRow(row) {
  if (!row) return null
  return {
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }
}

export async function createCategory(tenantId, { name, parentId, imageUrl, branchId }) {
  if (!branchId) throw httpError(422, 'branchId is required to create a category')

  if (parentId) {
    const { rows: parents } = await tenantQuery(
      tenantId,
      `
        SELECT id, is_active AS "isActive"
        FROM categories
        WHERE tenant_id = $1 AND id = $2 AND parent_id IS NULL
          AND branch_id = $3
        LIMIT 1
      `,
      [parentId, branchId],
    )
    if (!parents[0]) throw httpError(404, 'Parent category not found')
    if (!parents[0].isActive) throw httpError(409, 'Cannot add subcategory under an inactive category')
  }

  const { rows } = await tenantQuery(
    tenantId,
    `
      INSERT INTO categories (tenant_id, branch_id, parent_id, name, image_url, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
        branch_id AS "branchId"
    `,
    [branchId, parentId || null, name, imageUrl || null],
  )
  return mapCategoryRow(rows[0])
}

export async function updateCategory(tenantId, id, { name, imageUrl, isActive, branchId = null }) {
  if (isActive !== undefined) {
    return setCategoryActive(tenantId, id, isActive, { branchId })
  }

  const setClauses = []
  const params = [id, branchId]

  if (name !== undefined) {
    setClauses.push(`name = $${params.length + 2}`)
    params.push(name)
  }
  if (imageUrl !== undefined) {
    setClauses.push(`image_url = $${params.length + 2}`)
    params.push(imageUrl)
  }

  if (!setClauses.length) {
    const { rows } = await tenantQuery(
      tenantId,
      `
        SELECT id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
          branch_id AS "branchId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2
          ${branchClause('', 3)}
        LIMIT 1
      `,
      [id, branchId],
    )
    return mapCategoryRow(rows[0] || null)
  }

  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE categories
      SET ${setClauses.join(', ')}
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      RETURNING id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
        branch_id AS "branchId"
    `,
    params,
  )
  return mapCategoryRow(rows[0] || null)
}

// Soft-disable category.
// - Parent inactive → cascade inactive children; clear product category_id + subcategory_id
// - Subcategory inactive → clear product subcategory_id only
// Products stay active; category shows as N/A.
export async function setCategoryActive(tenantId, id, isActive, { branchId = null } = {}) {
  return withTransaction(async (client) => {
    const { rows: existing } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, parent_id AS "parentId", is_active AS "isActive", branch_id AS "branchId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2
          ${branchClause('', 3)}
        LIMIT 1
      `,
      [id, branchId],
    )
    const row = existing[0]
    if (!row) return null

    if (isActive) {
      if (row.parentId) {
        const { rows: parents } = await tenantClientQuery(
          client,
          tenantId,
          `
            SELECT is_active AS "isActive"
            FROM categories
            WHERE tenant_id = $1 AND id = $2
            LIMIT 1
          `,
          [row.parentId],
        )
        if (parents[0] && !parents[0].isActive) {
          throw httpError(409, 'Activate the parent category first')
        }
      }
      await tenantClientQuery(
        client,
        tenantId,
        `UPDATE categories SET is_active = true WHERE tenant_id = $1 AND id = $2`,
        [id],
      )
    } else {
      const isParent = !row.parentId
      if (isParent) {
        await tenantClientQuery(
          client,
          tenantId,
          `UPDATE categories SET is_active = false WHERE tenant_id = $1 AND (id = $2 OR parent_id = $2)`,
          [id],
        )
        await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE products
            SET category_id = NULL, subcategory_id = NULL
            WHERE tenant_id = $1 AND category_id = $2
          `,
          [id],
        )
      } else {
        await tenantClientQuery(
          client,
          tenantId,
          `UPDATE categories SET is_active = false WHERE tenant_id = $1 AND id = $2`,
          [id],
        )
        await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE products
            SET subcategory_id = NULL
            WHERE tenant_id = $1 AND subcategory_id = $2
          `,
          [id],
        )
      }
    }

    const { rows } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
          branch_id AS "branchId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2
        LIMIT 1
      `,
      [id],
    )
    return rows[0] || null
  })
}

// @deprecated Prefer setCategoryActive — hard delete kept for empty unused categories only
export async function deleteCategory(tenantId, id, { branchId = null } = {}) {
  return setCategoryActive(tenantId, id, false, { branchId })
}

export async function findOrCreateImportedCategory(tenantId, branchId) {
  if (!branchId) throw httpError(422, 'branchId is required to import products')

  const { rows: existing } = await tenantQuery(
    tenantId,
    `
      SELECT id FROM categories
      WHERE tenant_id = $1 AND branch_id = $2 AND name = 'Imported' AND parent_id IS NULL
      LIMIT 1
    `,
    [branchId],
  )
  if (existing[0]) return existing[0]
  return createCategory(tenantId, { name: 'Imported', branchId })
}

export async function listTaxes(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT id, name, rate_percent AS "ratePercent" FROM taxes WHERE tenant_id = $1 ORDER BY name`,
  )
  return rows
}

export async function listOffers(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT id, name, percent FROM offers WHERE tenant_id = $1 ORDER BY name`,
  )
  return rows
}

export async function listProducts(tenantId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 8))
  const offset = (page - 1) * limit

  const statusFilter =
    !filters.status || filters.status === 'all' ? null : filters.status

  const filterParams = [
    filters.q || null,
    filters.categoryId || null,
    filters.subcategoryId || null,
    filters.type || null,
    filters.scale || null,
    statusFilter,
    filters.branchId || null,
  ]

  // Single round-trip: page rows + total via window count (same response shape).
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
        p.quantity,
        p.reorder_point AS "reorderPoint",
        p.status,
        p.image_url AS "imageUrl",
        p.description,
        p.category_id AS "categoryId",
        p.subcategory_id AS "subcategoryId",
        p.branch_id AS "branchId",
        p.purchase_price AS "purchasePrice",
        p.selling_price AS "sellingPrice",
        p.discount_percent AS "discountPercent",
        p.offer_id AS "offerId",
        o.name AS "offerName",
        o.percent AS "offerPercent",
        p.last_purchase_price AS "lastPurchasePrice",
        p.last_selling_price AS "lastSellingPrice",
        last_s.company_name AS "lastPurchaseVendorName",
        curr_s.company_name AS "currentPurchaseVendorName",
        COALESCE(tax.tax_percent, 0) AS "taxPercent",
        COALESCE(tax.tax_names, ARRAY[]::text[]) AS "taxNames",
        round(
          (
            p.selling_price
            * (1 - COALESCE(p.discount_percent, 0) / 100)
            * (1 - COALESCE(o.percent, 0) / 100)
            * (1 + COALESCE(tax.tax_percent, 0) / 100)
          )::numeric,
          2
        ) AS "finalPrice",
        count(*) OVER()::int AS "_total"
      FROM products p
      LEFT JOIN offers o ON o.id = p.offer_id AND o.tenant_id = p.tenant_id
      LEFT JOIN suppliers last_s ON last_s.id = p.last_purchase_supplier_id AND last_s.tenant_id = p.tenant_id
      LEFT JOIN suppliers curr_s ON curr_s.id = p.current_purchase_supplier_id AND curr_s.tenant_id = p.tenant_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(sum(t.rate_percent), 0) AS tax_percent,
          array_remove(array_agg(t.name), NULL) AS tax_names
        FROM product_taxes pt
        JOIN taxes t ON t.id = pt.tax_id AND t.tenant_id = p.tenant_id
        WHERE pt.tenant_id = p.tenant_id AND pt.product_id = p.id
      ) tax ON true
      WHERE p.tenant_id = $1
        AND ($2::text IS NULL OR p.name ILIKE '%' || $2 || '%' OR p.item_code ILIKE '%' || $2 || '%' OR p.barcode ILIKE '%' || $2 || '%')
        AND ($3::uuid IS NULL OR p.category_id = $3)
        AND ($4::uuid IS NULL OR p.subcategory_id = $4)
        AND ($5::text IS NULL OR p.type = $5)
        AND ($6::text IS NULL OR p.scale = $6)
        AND ($7::text IS NULL OR p.status = $7)
        ${branchClause('p', 8)}
      ORDER BY p.created_at DESC
      LIMIT $9 OFFSET $10
    `,
    [...filterParams, limit, offset],
  )

  const total = rows[0]?._total || 0
  const items = rows.map(({ _total, ...item }) => ({
    ...item,
    imageUrl: normalizeImageUrl(item.imageUrl),
  }))
  return { items, total, page, limit }
}

export async function findProductByBarcode(tenantId, barcode, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, name, barcode, item_code AS "itemCode", branch_id AS "branchId"
      FROM products
      WHERE tenant_id = $1 AND barcode = $2
        ${branchClause('', 3)}
      LIMIT 1
    `,
    [barcode, branchId],
  )
  return rows[0] || null
}

export async function getProductById(tenantId, id, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, name, barcode, item_code AS "itemCode", branch_id AS "branchId"
      FROM products
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      LIMIT 1
    `,
    [id, branchId],
  )
  return rows[0] || null
}

export async function getProductDetail(tenantId, id, { branchId = null } = {}) {
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
        p.quantity,
        p.reorder_point AS "reorderPoint",
        p.status,
        p.image_url AS "imageUrl",
        p.description,
        p.category_id AS "categoryId",
        p.subcategory_id AS "subcategoryId",
        p.branch_id AS "branchId",
        p.purchase_price AS "purchasePrice",
        p.selling_price AS "sellingPrice",
        p.discount_percent AS "discountPercent",
        p.offer_id AS "offerId",
        o.name AS "offerName",
        o.percent AS "offerPercent",
        p.last_purchase_price AS "lastPurchasePrice",
        p.last_selling_price AS "lastSellingPrice",
        last_s.company_name AS "lastPurchaseVendorName",
        curr_s.company_name AS "currentPurchaseVendorName",
        COALESCE(tax.tax_percent, 0) AS "taxPercent",
        COALESCE(tax.tax_names, ARRAY[]::text[]) AS "taxNames",
        COALESCE(tax.tax_ids, ARRAY[]::uuid[]) AS "taxIds",
        round(
          (
            p.selling_price
            * (1 - COALESCE(p.discount_percent, 0) / 100)
            * (1 - COALESCE(o.percent, 0) / 100)
            * (1 + COALESCE(tax.tax_percent, 0) / 100)
          )::numeric,
          2
        ) AS "finalPrice"
      FROM products p
      LEFT JOIN offers o ON o.id = p.offer_id AND o.tenant_id = p.tenant_id
      LEFT JOIN suppliers last_s ON last_s.id = p.last_purchase_supplier_id AND last_s.tenant_id = p.tenant_id
      LEFT JOIN suppliers curr_s ON curr_s.id = p.current_purchase_supplier_id AND curr_s.tenant_id = p.tenant_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(sum(t.rate_percent), 0) AS tax_percent,
          array_remove(array_agg(t.name), NULL) AS tax_names,
          array_remove(array_agg(pt.tax_id), NULL) AS tax_ids
        FROM product_taxes pt
        JOIN taxes t ON t.id = pt.tax_id AND t.tenant_id = p.tenant_id
        WHERE pt.tenant_id = p.tenant_id AND pt.product_id = p.id
      ) tax ON true
      WHERE p.tenant_id = $1 AND p.id = $2
        ${branchClause('p', 3)}
      LIMIT 1
    `,
    [id, branchId],
  )
  const product = rows[0]
  if (!product) return null

  const { rows: bundleRows } = await tenantQuery(
    tenantId,
    `
      SELECT
        bi.item_id AS "itemId",
        bi.quantity,
        cp.name AS "itemName",
        cp.item_code AS "itemCode",
        cp.scale AS "itemScale"
      FROM bundle_items bi
      JOIN products cp ON cp.id = bi.item_id AND cp.tenant_id = bi.tenant_id
      WHERE bi.tenant_id = $1 AND bi.bundle_id = $2
      ORDER BY cp.name
    `,
    [id],
  )

  return {
    ...product,
    imageUrl: normalizeImageUrl(product.imageUrl),
    bundleItems: bundleRows,
  }
}

async function attachTaxes(client, tenantId, productId, taxIds = []) {
  await tenantClientQuery(
    client,
    tenantId,
    `DELETE FROM product_taxes WHERE tenant_id = $1 AND product_id = $2`,
    [productId],
  )
  if (!taxIds.length) return

  const uniqueIds = [...new Set(taxIds)]
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `SELECT id FROM taxes WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
    [uniqueIds],
  )
  if (rows.length !== uniqueIds.length) throw httpError(422, 'One or more taxes do not belong to this tenant')

  await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO product_taxes (tenant_id, product_id, tax_id)
      SELECT $1, $2, x.tax_id
      FROM unnest($3::uuid[]) AS x(tax_id)
    `,
    [productId, rows.map((row) => row.id)],
  )
}

async function attachBundleItems(client, tenantId, bundleId, bundleItems = [], branchId = null) {
  await tenantClientQuery(
    client,
    tenantId,
    `DELETE FROM bundle_items WHERE tenant_id = $1 AND bundle_id = $2`,
    [bundleId],
  )
  if (!bundleItems.length) return

  if (bundleItems.some((item) => item.itemId === bundleId)) {
    throw httpError(422, 'A bundle cannot contain itself as an item')
  }

  const ids = bundleItems.map((item) => item.itemId)
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id FROM products
      WHERE tenant_id = $1 AND id = ANY($2::uuid[])
        ${branchClause('', 3)}
    `,
    [ids, branchId],
  )
  if (rows.length !== new Set(ids).size) {
    throw httpError(422, 'One or more bundle items do not belong to this branch')
  }

  await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO bundle_items (tenant_id, bundle_id, item_id, quantity)
      SELECT $1, $2, x.item_id, x.quantity
      FROM unnest($3::uuid[], $4::numeric[]) AS x(item_id, quantity)
    `,
    [bundleId, ids, bundleItems.map((item) => item.quantity)],
  )
}

async function validateProductCategories(client, tenantId, { categoryId, subcategoryId, branchId }) {
  if (categoryId) {
    const { rows: cats } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, is_active AS "isActive", parent_id AS "parentId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2 AND branch_id = $3
        LIMIT 1
      `,
      [categoryId, branchId],
    )
    if (!cats[0]) throw httpError(404, 'Category not found')
    if (!cats[0].isActive) throw httpError(409, 'Cannot assign an inactive category')
    if (cats[0].parentId) throw httpError(400, 'categoryId must be a parent category')
  }
  if (subcategoryId) {
    const { rows: subs } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, is_active AS "isActive", parent_id AS "parentId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2 AND branch_id = $3
        LIMIT 1
      `,
      [subcategoryId, branchId],
    )
    if (!subs[0]) throw httpError(404, 'Subcategory not found')
    if (!subs[0].isActive) throw httpError(409, 'Cannot assign an inactive subcategory')
    if (!subs[0].parentId) throw httpError(400, 'subcategoryId must be a subcategory')
    if (categoryId && subs[0].parentId !== categoryId) {
      throw httpError(400, 'Subcategory does not belong to the selected category')
    }
  }
}

async function resolveBundlePrices(client, tenantId, bundleItems = [], branchId = null) {
  if (!bundleItems.length) return { purchasePrice: 0, sellingPrice: 0 }

  const ids = bundleItems.map((item) => item.itemId)
  const qtyById = new Map(bundleItems.map((item) => [item.itemId, Number(item.quantity) || 1]))

  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id, purchase_price AS "purchasePrice", selling_price AS "sellingPrice"
      FROM products
      WHERE tenant_id = $1 AND id = ANY($2::uuid[])
        ${branchClause('', 3)}
    `,
    [ids, branchId],
  )

  let purchasePrice = 0
  let sellingPrice = 0
  for (const row of rows) {
    const qty = qtyById.get(row.id) || 1
    purchasePrice += Number(row.purchasePrice || 0) * qty
    sellingPrice += Number(row.sellingPrice || 0) * qty
  }

  return {
    purchasePrice: Math.round(purchasePrice * 100) / 100,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
  }
}

export async function createProduct(tenantId, payload) {
  if (!payload.branchId) throw httpError(422, 'branchId is required to create a product')

  return withTransaction(async (client) => {
    if (payload.categoryId || payload.subcategoryId) {
      await validateProductCategories(client, tenantId, {
        categoryId: payload.categoryId,
        subcategoryId: payload.subcategoryId,
        branchId: payload.branchId,
      })
      if (payload.subcategoryId && !payload.categoryId) {
        throw httpError(400, 'categoryId is required when subcategoryId is set')
      }
    }

    let purchasePrice = payload.purchasePrice ?? 0
    let sellingPrice = payload.sellingPrice ?? 0
    if (payload.type === PRODUCT_TYPES.BUNDLE && payload.bundleItems?.length) {
      const derived = await resolveBundlePrices(
        client,
        tenantId,
        payload.bundleItems,
        payload.branchId,
      )
      purchasePrice = derived.purchasePrice
      sellingPrice = derived.sellingPrice
    }

    const { rows } = await tenantClientQuery(
      client,
      tenantId,
      `
        INSERT INTO products (
          tenant_id, branch_id, category_id, subcategory_id, type, item_code, name, image_url,
          scale, barcode, description, purchase_price, selling_price, offer_id, discount_percent, quantity, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active')
        RETURNING id, name, item_code AS "itemCode", barcode, type, status, branch_id AS "branchId"
      `,
      [
        payload.branchId,
        payload.categoryId || null,
        payload.subcategoryId || null,
        payload.type,
        payload.itemCode,
        payload.name,
        payload.imageUrl || null,
        payload.scale,
        payload.barcode,
        payload.description || null,
        purchasePrice,
        sellingPrice,
        payload.offerId || null,
        payload.discountPercent || null,
        payload.quantity ?? 0,
      ],
    )
    const product = rows[0]
    await attachTaxes(client, tenantId, product.id, payload.taxIds || [])
    if (payload.type === PRODUCT_TYPES.BUNDLE) {
      await attachBundleItems(client, tenantId, product.id, payload.bundleItems || [], payload.branchId)
    }
    return product
  })
}

// Maps camelCase payload keys to SQL column names. Columns whose values can
// legitimately be NULLed by the caller are included here; simple-string fields
// that cannot be set to NULL intentionally are also listed.
const UPDATABLE_COLUMNS = {
  name: 'name',
  categoryId: 'category_id',
  subcategoryId: 'subcategory_id',
  status: 'status',
  scale: 'scale',
  description: 'description',
  purchasePrice: 'purchase_price',
  sellingPrice: 'selling_price',
  discountPercent: 'discount_percent',
  offerId: 'offer_id',
  imageUrl: 'image_url',
}

export async function updateProduct(tenantId, id, payload, { branchId = null } = {}) {
  return withTransaction(async (client) => {
    const { rows: existingRows } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, category_id AS "categoryId", branch_id AS "branchId", quantity
        FROM products
        WHERE tenant_id = $1 AND id = $2
          ${branchClause('', 3)}
        LIMIT 1
      `,
      [id, branchId],
    )
    const existing = existingRows[0]
    if (!existing) return null

    const effectiveBranchId = existing.branchId || branchId
    const hasCategoryPatch = 'categoryId' in payload || 'subcategoryId' in payload

    if (hasCategoryPatch) {
      const nextCategoryId =
        'categoryId' in payload ? payload.categoryId ?? null : existing.categoryId
      const nextSubcategoryId =
        'subcategoryId' in payload ? payload.subcategoryId ?? null : undefined

      if (nextSubcategoryId && !nextCategoryId) {
        throw httpError(400, 'categoryId is required when subcategoryId is set')
      }

      if (nextCategoryId || nextSubcategoryId) {
        await validateProductCategories(client, tenantId, {
          categoryId: nextCategoryId,
          subcategoryId: nextSubcategoryId,
          branchId: effectiveBranchId,
        })
      }

      if ('categoryId' in payload && !('subcategoryId' in payload) && payload.categoryId !== existing.categoryId) {
        payload.subcategoryId = null
      }
    }

    // Collect only the keys the caller explicitly sent so we never COALESCE away
    // a deliberate NULL (e.g. removing a discount or unlinking an offer).
    const setClauses = []
    const params = [id, branchId] // $2 = id; $3 = branchId; $1 is tenantId injected by tenantClientQuery

    for (const [payloadKey, column] of Object.entries(UPDATABLE_COLUMNS)) {
      if (!(payloadKey in payload)) continue // key not sent → leave column alone

      const paramIndex = params.length + 2 // +2 because tenantId=$1 is prepended
      const value = payload[payloadKey] ?? null

      if (payloadKey === 'sellingPrice') {
        // Snapshot the old selling_price before overwriting it
        setClauses.push(`
          last_selling_price = CASE
            WHEN $${paramIndex}::numeric IS NOT NULL AND selling_price IS DISTINCT FROM $${paramIndex}::numeric
              THEN selling_price
            ELSE last_selling_price
          END,
          selling_price = $${paramIndex}::numeric`)
      } else if (payloadKey === 'purchasePrice') {
        setClauses.push(`purchase_price = $${paramIndex}::numeric`)
      } else if (payloadKey === 'discountPercent') {
        setClauses.push(`discount_percent = $${paramIndex}::numeric`)
      } else if (payloadKey === 'offerId') {
        setClauses.push(`offer_id = $${paramIndex}::uuid`)
      } else if (payloadKey === 'categoryId') {
        setClauses.push(`category_id = $${paramIndex}::uuid`)
      } else if (payloadKey === 'subcategoryId') {
        setClauses.push(`subcategory_id = $${paramIndex}::uuid`)
      } else if (payloadKey === 'imageUrl') {
        setClauses.push(`image_url = $${paramIndex}`)
      } else {
        setClauses.push(`${column} = $${paramIndex}`)
      }

      params.push(value)
    }

    if (!setClauses.length && !payload.taxIds && !payload.bundleItems) {
      // Nothing to update; fetch current row and return it as-is
      const { rows: current } = await tenantClientQuery(
        client,
        tenantId,
        `
          SELECT id, name, status, branch_id AS "branchId",
            category_id AS "categoryId", subcategory_id AS "subcategoryId"
          FROM products
          WHERE tenant_id = $1 AND id = $2
            ${branchClause('', 3)}
        `,
        [id, branchId],
      )
      return current[0] || null
    }

    let product = null

    if (setClauses.length) {
      setClauses.push('updated_at = now()')
      const { rows } = await tenantClientQuery(
        client,
        tenantId,
        `
          UPDATE products SET ${setClauses.join(', ')}
          WHERE tenant_id = $1 AND id = $2
            ${branchClause('', 3)}
          RETURNING id, name, status, branch_id AS "branchId",
            category_id AS "categoryId", subcategory_id AS "subcategoryId"
        `,
        params,
      )
      product = rows[0] || null
      if (!product) return null
    } else {
      const { rows } = await tenantClientQuery(
        client,
        tenantId,
        `
          SELECT id, name, status, branch_id AS "branchId",
            category_id AS "categoryId", subcategory_id AS "subcategoryId"
          FROM products
          WHERE tenant_id = $1 AND id = $2
            ${branchClause('', 3)}
        `,
        [id, branchId],
      )
      product = rows[0] || null
      if (!product) return null
    }

    if (payload.taxIds !== undefined) await attachTaxes(client, tenantId, id, payload.taxIds)
    if (payload.bundleItems !== undefined) {
      const effectiveBranchId = product.branchId || branchId
      await attachBundleItems(client, tenantId, id, payload.bundleItems, effectiveBranchId)
      const derived = await resolveBundlePrices(
        client,
        tenantId,
        payload.bundleItems,
        effectiveBranchId,
      )
      await tenantClientQuery(
        client,
        tenantId,
        `
          UPDATE products
          SET purchase_price = $3, selling_price = $4
          WHERE tenant_id = $1 AND id = $2
        `,
        [id, derived.purchasePrice, derived.sellingPrice],
      )
    }
    return product
  })
}

export async function getProductDeleteEligibility(tenantId, id, { branchId = null } = {}) {
  const { rows: products } = await tenantQuery(
    tenantId,
    `
      SELECT id, quantity, status
      FROM products
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      LIMIT 1
    `,
    [id, branchId],
  )
  const product = products[0]
  if (!product) return { found: false, canPermanentDelete: false }

  if (Number(product.quantity) > 0) {
    return {
      found: true,
      canPermanentDelete: false,
      reason: 'Product has stock on hand',
    }
  }

  const { rows: branchStock } = await tenantQuery(
    tenantId,
    `
      SELECT COALESCE(sum(quantity), 0)::numeric AS total
      FROM branch_inventory
      WHERE tenant_id = $1 AND product_id = $2
    `,
    [id],
  )
  if (Number(branchStock[0]?.total || 0) > 0) {
    return {
      found: true,
      canPermanentDelete: false,
      reason: 'Product has branch inventory stock',
    }
  }

  const checks = [
    {
      sql: `SELECT 1 FROM sale_items WHERE tenant_id = $1 AND product_id = $2 LIMIT 1`,
      reason: 'Product has sales history',
    },
    {
      sql: `SELECT 1 FROM inventory_ledger WHERE tenant_id = $1 AND product_id = $2 LIMIT 1`,
      reason: 'Product has inventory ledger history',
    },
    {
      sql: `SELECT 1 FROM bundle_items WHERE tenant_id = $1 AND item_id = $2 LIMIT 1`,
      reason: 'Product is used in a bundle',
    },
    {
      sql: `SELECT 1 FROM purchase_order_items WHERE tenant_id = $1 AND product_id = $2 LIMIT 1`,
      reason: 'Product has purchase order history',
    },
  ]

  for (const check of checks) {
    const { rows } = await tenantQuery(tenantId, check.sql, [id])
    if (rows[0]) {
      return { found: true, canPermanentDelete: false, reason: check.reason }
    }
  }

  return { found: true, canPermanentDelete: true }
}

export async function permanentDeleteProduct(tenantId, id, { branchId = null } = {}) {
  const eligibility = await getProductDeleteEligibility(tenantId, id, { branchId })
  if (!eligibility.found) return null
  if (!eligibility.canPermanentDelete) {
    throw httpError(409, eligibility.reason || 'Product cannot be permanently deleted')
  }

  return withTransaction(async (client) => {
    const { rows } = await tenantClientQuery(
      client,
      tenantId,
      `
        DELETE FROM products
        WHERE tenant_id = $1 AND id = $2
          ${branchClause('', 3)}
        RETURNING id
      `,
      [id, branchId],
    )
    return Boolean(rows[0])
  })
}

export async function deleteProduct(tenantId, id, { branchId = null, permanent = false } = {}) {
  if (permanent) {
    return permanentDeleteProduct(tenantId, id, { branchId })
  }

  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE products
      SET status = 'inactive'
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      RETURNING id
    `,
    [id, branchId],
  )
  return Boolean(rows[0])
}
