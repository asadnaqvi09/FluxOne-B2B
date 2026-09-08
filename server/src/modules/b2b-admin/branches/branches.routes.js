import { Router } from 'express'
import { asyncHandler } from '../../../middlewares/error.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import {
  branchDetail,
  branchesList,
  createBranch,
  patchBranch,
  patchBranchStatus,
  resetPassword,
} from './branches.controller.js'
import {
  branchIdParamsSchema,
  branchStatusSchema,
  createBranchSchema,
  listBranchesQuerySchema,
  resetPasswordSchema,
  updateBranchSchema,
} from './branches.validator.js'

const router = Router()

router.get('/', validate(listBranchesQuerySchema), asyncHandler(branchesList))
router.get('/:id', validate(branchIdParamsSchema), asyncHandler(branchDetail))
router.post('/', validate(createBranchSchema), asyncHandler(createBranch))
router.patch('/:id', validate(updateBranchSchema), asyncHandler(patchBranch))
router.patch('/:id/status', validate(branchStatusSchema), asyncHandler(patchBranchStatus))
router.post('/:id/reset-password', validate(resetPasswordSchema), asyncHandler(resetPassword))

export default router
