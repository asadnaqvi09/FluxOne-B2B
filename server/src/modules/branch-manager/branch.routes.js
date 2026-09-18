import { Router } from 'express'
import dashboardRoutes from './dashboard/dashboard.routes.js'
import staffRoutes from './staff/staff.routes.js'
import designationRoutes from './designations/designation.routes.js'
import activityLogsRoutes from './activity-logs/activity_logs.routes.js'
import { attendanceList, markAttendance } from './attendance/attendance.controller.js'
import {
  listScales,
  createScale,
  updateScale,
  deleteScale,
  scoreStaff,
  getStaffScores,
} from './performance/performance.controller.js'
import { holidaysList, addHoliday, editHoliday, removeHoliday } from './holidays/holidays.controller.js'
import {
  leavesList,
  addLeave,
  editLeave,
  removeLeave,
  myLeavesList,
  addMyLeave,
  editMyLeave,
  removeMyLeave,
} from './leaves/leaves.controller.js'
import {
  createStaffLeaveSchema,
  createMyLeaveSchema,
  updateStaffLeaveSchema,
  updateMyLeaveSchema,
  listStaffLeavesSchema,
  leaveIdParamsSchema,
} from './leaves/leaves.validator.js'
import { salesList, processRefund } from './sales/sales.controller.js'
import { getDiscounts, addDiscount, editDiscount, removeDiscount } from './discounts/discounts.controller.js'
import { addStockRequest, stockRequestList } from './stock/stock_request.controller.js'
import {
  hardwareList,
  hardwareCreate,
  hardwareUpdate,
  hardwareRemove,
  scalesList,
  scalesCreate,
  scalesUpdate,
  scalesRemove,
} from './resources/resources.controller.js'
import { asyncHandler } from '../../middlewares/error.middleware.js'
import { requirePermission } from '../../middlewares/role.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { upload } from '../../middlewares/upload.middleware.js'
import { attendanceSchema } from './attendance/attendance.validator.js'
import { createStockRequestSchema, listStockRequestsSchema } from './stock/stock_request.validator.js'

const router = Router()

// Sub-routes
router.use('/dashboard', dashboardRoutes)
router.use('/staff', staffRoutes)
router.use('/designations', designationRoutes)
router.use('/activity-logs', activityLogsRoutes)

// Attendance
router.get('/attendance', requirePermission('attendance:write'), asyncHandler(attendanceList))
router.post(
  '/attendance',
  requirePermission('attendance:write'),
  validate(attendanceSchema),
  asyncHandler(markAttendance),
)

// Holidays
router.get('/holidays', requirePermission('staff:read'), asyncHandler(holidaysList))
router.post('/holidays', requirePermission('staff:write'), asyncHandler(addHoliday))
router.put('/holidays/:id', requirePermission('staff:write'), asyncHandler(editHoliday))
router.delete('/holidays/:id', requirePermission('staff:write'), asyncHandler(removeHoliday))

// Leaves — My Leave (BM self) must be registered before /leaves/:id
router.get('/leaves/me', requirePermission('staff:read'), asyncHandler(myLeavesList))
router.post(
  '/leaves/me',
  requirePermission('staff:write'),
  validate(createMyLeaveSchema),
  asyncHandler(addMyLeave),
)
router.put(
  '/leaves/me/:id',
  requirePermission('staff:write'),
  validate(updateMyLeaveSchema),
  asyncHandler(editMyLeave),
)
router.delete(
  '/leaves/me/:id',
  requirePermission('staff:write'),
  validate(leaveIdParamsSchema),
  asyncHandler(removeMyLeave),
)

// Leaves — Staff Leave (BM appoints employees)
router.get(
  '/leaves',
  requirePermission('staff:read'),
  validate(listStaffLeavesSchema),
  asyncHandler(leavesList),
)
router.post(
  '/leaves',
  requirePermission('staff:write'),
  validate(createStaffLeaveSchema),
  asyncHandler(addLeave),
)
router.put(
  '/leaves/:id',
  requirePermission('staff:write'),
  validate(updateStaffLeaveSchema),
  asyncHandler(editLeave),
)
router.delete(
  '/leaves/:id',
  requirePermission('staff:write'),
  validate(leaveIdParamsSchema),
  asyncHandler(removeLeave),
)

// Sales
router.get('/sales', requirePermission('branch-dashboard:read'), asyncHandler(salesList))
router.post('/sales/:id/refund', requirePermission('staff:write'), asyncHandler(processRefund))

// Performance Scoring & Scales
router.get('/performance/scales', requirePermission('performance:read'), asyncHandler(listScales))
router.post('/performance/scales', requirePermission('staff:write'), asyncHandler(createScale))
router.put('/performance/scales/:id', requirePermission('staff:write'), asyncHandler(updateScale))
router.delete('/performance/scales/:id', requirePermission('staff:write'), asyncHandler(deleteScale))
router.get('/performance/scores', requirePermission('performance:read'), asyncHandler(getStaffScores))
router.post('/performance/scores', requirePermission('staff:write'), asyncHandler(scoreStaff))

// Discounts
router.get('/discounts', requirePermission('items:read'), asyncHandler(getDiscounts))
router.post('/discounts', requirePermission('items:write'), asyncHandler(addDiscount))
router.put('/discounts/:id', requirePermission('items:write'), asyncHandler(editDiscount))
router.delete('/discounts/:id', requirePermission('items:write'), asyncHandler(removeDiscount))

// Resources — POS hardware + item scales
router.get('/resources/hardware', requirePermission('resources:read'), asyncHandler(hardwareList))
router.post(
  '/resources/hardware',
  requirePermission('resources:write'),
  upload.single('image'),
  asyncHandler(hardwareCreate),
)
router.put(
  '/resources/hardware/:id',
  requirePermission('resources:write'),
  upload.single('image'),
  asyncHandler(hardwareUpdate),
)
router.delete('/resources/hardware/:id', requirePermission('resources:write'), asyncHandler(hardwareRemove))
router.get('/resources/scales', requirePermission('resources:read'), asyncHandler(scalesList))
router.post('/resources/scales', requirePermission('resources:write'), asyncHandler(scalesCreate))
router.put('/resources/scales/:id', requirePermission('resources:write'), asyncHandler(scalesUpdate))
router.delete('/resources/scales/:id', requirePermission('resources:write'), asyncHandler(scalesRemove))

// Stock Requests
router.get(
  '/stock-requests',
  requirePermission('stock:read'),
  validate(listStockRequestsSchema),
  asyncHandler(stockRequestList),
)
router.post(
  '/stock-requests',
  requirePermission('stock-requests:write'),
  validate(createStockRequestSchema),
  asyncHandler(addStockRequest),
)

export default router
