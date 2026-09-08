import { Router } from 'express'
import { asyncHandler } from '../../../middlewares/error.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import {
  bulkProfitHandler,
  bulkTaxHandler,
  taxProfitMeta,
  taxProfitProductsList,
} from './tax-profit.controller.js'
import {
  bulkProfitSchema,
  bulkTaxSchema,
  listTaxProfitQuerySchema,
  taxProfitMetaSchema,
} from './tax-profit.validator.js'

const router = Router()

router.get('/meta', validate(taxProfitMetaSchema), asyncHandler(taxProfitMeta))
router.get('/products', validate(listTaxProfitQuerySchema), asyncHandler(taxProfitProductsList))
router.patch('/bulk-profit', validate(bulkProfitSchema), asyncHandler(bulkProfitHandler))
router.patch('/bulk-tax', validate(bulkTaxSchema), asyncHandler(bulkTaxHandler))

export default router
