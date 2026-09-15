import { createOffer, listOffers, updateOffer, deleteOffer } from './discounts.model.js'
import { success, fail } from '../../../utils/response.util.js'

export async function getDiscounts(req, res) {
  try {
    const categoryId = req.query.categoryId || undefined
    const rows = await listOffers(req.tenantId, { categoryId })
    return success(res, rows)
  } catch (err) {
    return fail(res, err.message || 'Failed to list discounts', err.status || 500)
  }
}

export async function addDiscount(req, res) {
  const { name, percent, categoryId } = req.body
  if (!name || percent === undefined) {
    return fail(res, 'Discount name and percentage are required', 400)
  }

  try {
    const row = await createOffer(req.tenantId, { name, percent, categoryId })
    return success(res, row, 201)
  } catch (err) {
    return fail(res, err.message || 'Failed to create discount', err.status || 500)
  }
}

export async function editDiscount(req, res) {
  const { id } = req.params
  const { name, percent, categoryId } = req.body

  if (!name || percent === undefined) {
    return fail(res, 'Discount name and percentage are required', 400)
  }

  try {
    const row = await updateOffer(req.tenantId, id, { name, percent, categoryId })
    if (!row) {
      return fail(res, 'Discount not found', 404)
    }
    return success(res, row)
  } catch (err) {
    return fail(res, err.message || 'Failed to update discount', err.status || 500)
  }
}

export async function removeDiscount(req, res) {
  const { id } = req.params
  try {
    const ok = await deleteOffer(req.tenantId, id)
    if (!ok) {
      return fail(res, 'Discount not found', 404)
    }
    return success(res, { message: 'Discount deleted successfully' })
  } catch (err) {
    return fail(res, err.message || 'Failed to delete discount', err.status || 500)
  }
}
