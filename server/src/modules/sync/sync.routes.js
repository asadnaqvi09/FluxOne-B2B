import { Router } from 'express'
import { bootstrap, delta, events, pull, push, sales } from './sync.controller.js'
import { asyncHandler } from '../../middlewares/error.middleware.js'
import { requirePermission } from '../../middlewares/role.middleware.js'

const router = Router()

router.post('/push', requirePermission('sync:push'), asyncHandler(push))
router.get('/bootstrap', requirePermission('sync:pull'), asyncHandler(bootstrap))
router.get('/delta', requirePermission('sync:pull'), asyncHandler(delta))
router.get('/sales', requirePermission('sync:pull'), asyncHandler(sales))
router.get('/events', requirePermission('sync:pull'), asyncHandler(events))
/** @deprecated Prefer /bootstrap and /delta for POS. Kept for backward compatibility. */
router.get('/pull', requirePermission('sync:pull'), asyncHandler(pull))

export default router
