import {
  createCategory,
  createProduct,
  deleteProduct,
  findOrCreateImportedCategory,
  findProductByBarcode,
  getProductById,
  getProductDeleteEligibility,
  getProductDetail,
  listCategories,
  listOffers,
  listProducts,
  listTaxes,
  setCategoryActive,
  updateCategory,
  updateProduct,
} from './product.model.js'
import { resolveInventoryCreateScope, resolveInventoryScope } from '../shared.access.js'
import { PRODUCT_TYPES } from '../../../config/constants.js'
import { generateBarcodeValue, generateItemCode, renderBarcodePng } from '../../../utils/barcode.util.js'
import { fail, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'
import { resolveUploadUrl } from '../../../utils/uploadUrl.util.js'

function scopeError(res, err) {
  if (err?.status) return fail(res, err.message, err.status)
  throw err
}

export async function categories(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const active = req.query?.active || 'all'
    return success(res, await listCategories(tenantId, { active, branchId }))
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function taxes(req, res) {
  return success(res, await listTaxes(req.tenantId))
}

export async function offers(req, res) {
  return success(res, await listOffers(req.tenantId))
}

export async function addCategory(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryCreateScope(req)
    const row = await createCategory(tenantId, {
      ...req.validated.body,
      imageUrl: resolveUploadUrl(req.file, req),
      branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function patchCategory(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await updateCategory(tenantId, req.validated.params.id, {
      ...req.validated.body,
      ...(req.file ? { imageUrl: resolveUploadUrl(req.file, req) } : {}),
      branchId,
    })
    if (!row) return fail(res, 'Category not found', 404)
    return success(res, row)
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function removeCategory(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await setCategoryActive(tenantId, req.validated.params.id, false, { branchId })
    if (!row) return fail(res, 'Category not found', 404)
    return success(res, { id: row.id, isActive: false, deactivated: true })
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function products(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const result = await listProducts(tenantId, { ...req.validated.query, branchId })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function addProduct(req, res) {
  const body = req.validated.body
  if (body.confirmed === false) {
    return fail(res, 'Confirmation is required before save', 422)
  }

  try {
    const { tenantId, branchId } = resolveInventoryCreateScope(req)
    const itemCode = body.itemCode || body.sku || generateItemCode()
    const barcode = body.barcode || generateBarcodeValue()
    const row = await createProduct(tenantId, {
      ...body,
      branchId,
      imageUrl: resolveUploadUrl(req.file, req),
      itemCode,
      barcode,
      // Variant children carry their own codes; parent still needs unique placeholders
      createdBy: req.user?.id || null,
    })
    return success(res, row, 201)
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function addBundle(req, res) {
  if (!req.validated.body.bundleItems?.length) {
    return fail(res, 'Bundle must include at least one item', 422)
  }
  req.validated.body.type = PRODUCT_TYPES.BUNDLE
  return addProduct(req, res)
}

export async function importItems(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryCreateScope(req)
    const category = await findOrCreateImportedCategory(tenantId, branchId)
    const created = []
    const errors = []

    for (const [index, row] of req.validated.body.rows.entries()) {
      try {
        const product = await createProduct(tenantId, {
          name: row.name,
          categoryId: category.id,
          branchId,
          type: PRODUCT_TYPES.SINGLE,
          scale: row.scale || 'unit',
          itemCode: row.sku,
          barcode: row.barcode || generateBarcodeValue(),
          purchasePrice: row.purchasePrice ?? 0,
          sellingPrice: row.sellingPrice ?? 0,
          quantity: row.quantity ?? 0,
        })
        created.push(product)
      } catch (err) {
        const message =
          err?.code === '23505'
            ? `Row ${index + 1}: item code or barcode already exists (${row.sku})`
            : err?.message || `Row ${index + 1}: import failed`
        errors.push(message)
      }
    }

    if (!created.length) {
      return fail(res, errors[0] || 'No products imported', 409)
    }

    return success(
      res,
      {
        imported: created.length,
        failed: errors.length,
        errors: errors.length ? errors : undefined,
        items: created,
      },
      201,
    )
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function scan(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const item = await findProductByBarcode(tenantId, req.validated.body.barcode, { branchId })
    if (!item) return fail(res, 'No item found for this barcode', 404)
    return success(res, item)
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function detail(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await getProductDetail(tenantId, req.validated.params.id, { branchId })
    if (!row) return fail(res, 'Item not found', 404)
    return success(res, row)
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function printBarcode(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const item = await getProductById(tenantId, req.validated.params.id, { branchId })
    if (!item) return fail(res, 'Item not found', 404)
    const png = await renderBarcodePng(item.barcode)
    res.setHeader('Content-Type', 'image/png')
    return res.send(png)
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function update(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await updateProduct(
      tenantId,
      req.validated.params.id,
      {
        ...req.validated.body,
        ...(req.file ? { imageUrl: resolveUploadUrl(req.file, req) } : {}),
        createdBy: req.user?.id || null,
      },
      { branchId },
    )
    if (!row) return fail(res, 'Item not found', 404)
    return success(res, row)
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function remove(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const permanent = Boolean(req.validated.query?.permanent)
    const deactivated = await deleteProduct(tenantId, req.validated.params.id, {
      branchId,
      permanent,
    })
    if (!deactivated) return fail(res, 'Item not found', 404)
    if (permanent) {
      return success(res, { id: req.validated.params.id, deleted: true, permanent: true })
    }
    return success(res, { id: req.validated.params.id, status: 'inactive', deactivated: true })
  } catch (err) {
    return scopeError(res, err)
  }
}

export async function deleteInfo(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const info = await getProductDeleteEligibility(tenantId, req.validated.params.id, { branchId })
    if (!info.found) return fail(res, 'Item not found', 404)
    return success(res, info)
  } catch (err) {
    return scopeError(res, err)
  }
}
