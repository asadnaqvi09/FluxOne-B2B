import { Router } from 'express'
import { requireRoles } from '../../middlewares/role.middleware.js'
import { ROLES } from '../../config/constants.js'
import dashboardRoutes from './dashboard/dashboard.routes.js'
import branchesRoutes from './branches/branches.routes.js'

const router = Router()

router.use(requireRoles(ROLES.B2B_ADMIN))
router.use('/dashboard', dashboardRoutes)
router.use('/branches', branchesRoutes)

export default router
