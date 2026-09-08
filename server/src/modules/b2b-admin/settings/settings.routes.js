import { Router } from 'express'
import { asyncHandler } from '../../../middlewares/error.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import { devicesList, patchDeviceStatus } from './settings.controller.js'
import {
  listDevicesQuerySchema,
  updateDeviceStatusSchema,
} from './settings.validator.js'

const router = Router()

router.get('/devices', validate(listDevicesQuerySchema), asyncHandler(devicesList))
router.patch(
  '/devices/:id/status',
  validate(updateDeviceStatusSchema),
  asyncHandler(patchDeviceStatus),
)

export default router
