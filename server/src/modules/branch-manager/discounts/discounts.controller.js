import { createOffer, listOffers, updateOffer, deleteOffer } from './discounts.model.js'
import { success, fail, failFromError } from '../../../utils/response.util.js'

export async function getDiscounts(req, res) {
  try {
    const categoryId = req.validated.query.categoryId || undefined
    const rows = await listOffers(req.tenantId, { categoryId })
    return success(res, rows)
  } catch (err) {
    return failFromError(res, err, 'Failed to list discounts')
  }
}

export async function addDiscount(req, res) {
  const { name, percent, categoryId } = req.validated.body

  try {
    const row = await createOffer(req.tenantId, { name, percent, categoryId })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create discount')
  }
}

export async function editDiscount(req, res) {
  const { id } = req.validated.params
  const { name, percent, categoryId } = req.validated.body

  try {
    const row = await updateOffer(req.tenantId, id, { name, percent, categoryId })
    if (!row) {
      return fail(res, 'Discount not found', 404)
    }
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to update discount')
  }
}

export async function removeDiscount(req, res) {
  const { id } = req.validated.params
  try {
    const ok = await deleteOffer(req.tenantId, id)
    if (!ok) {
      return fail(res, 'Discount not found', 404)
    }
    return success(res, { message: 'Discount deleted successfully' })
  } catch (err) {
    return failFromError(res, err, 'Failed to delete discount')
  }
}
