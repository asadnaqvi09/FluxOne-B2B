import { listSales, refundSale } from './sales.model.js'
import { success, fail, failFromError } from '../../../utils/response.util.js'

export async function salesList(req, res) {
  try {
    const filters = {
      q: req.validated.query.q,
      date: req.validated.query.date,
      category_id: req.validated.query.categoryId,
    }
    const rows = await listSales(req.tenantId, filters)

    // Calculate dynamic KPIs for the list response
    const totalSalesSum = rows.reduce((acc, r) => acc + parseFloat(r.finalAmount || 0), 0)
    const refundCount = rows.filter((r) => r.status === 'refunded').length
    const totalTransactions = rows.length

    return success(res, {
      items: rows,
      kpis: {
        totalSales: totalSalesSum,
        totalRefunds: refundCount,
        transactionCount: totalTransactions,
      },
    })
  } catch (err) {
    return failFromError(res, err, 'Failed to retrieve sales logs')
  }
}

export async function processRefund(req, res) {
  const { id } = req.validated.params
  try {
    const row = await refundSale(req.tenantId, id)
    if (!row) {
      return fail(res, 'Sale record not found or already refunded', 404)
    }
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to process refund')
  }
}
