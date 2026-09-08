import { z } from 'zod'
import { empty } from '../../branch-manager/shared.validator.js'
import { BRANCH_STATUS } from '../../../config/constants.js'

//UUID-shaped id (allows legacy seed UUIDs that are not RFC-version-strict).
const looseUuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid branch id',
  )

const optionalString = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.string().optional(),
)

const genderSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.enum(['Male', 'Female', 'Other']).optional(),
)

const managerCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(190),
  contact: optionalString,
  otherContact: optionalString,
  gender: genderSchema,
  address: optionalString,
  profileImage: optionalString,
  imageUrl: optionalString,
})

const managerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(190).optional(),
  contact: optionalString,
  otherContact: optionalString,
  gender: genderSchema,
  address: optionalString,
  profileImage: optionalString,
  imageUrl: optionalString,
})

export const listBranchesQuerySchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    q: optionalString,
    status: z.enum([BRANCH_STATUS.OPEN, BRANCH_STATUS.BLOCKED]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
})

export const branchIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160),
    location: optionalString,
    image: optionalString,
    imageUrl: optionalString,
    status: z.enum([BRANCH_STATUS.OPEN, BRANCH_STATUS.BLOCKED]).optional(),
    /** Nested manager, or flat manager* fields accepted in controller normalize. */
    manager: managerCreateSchema.optional(),
    managerName: optionalString,
    managerEmail: optionalString,
    managerContact: optionalString,
    managerOtherContact: optionalString,
    managerGender: genderSchema,
    managerAddress: optionalString,
    profileImage: optionalString,
    managerProfileImage: optionalString,
  }),
  query: empty,
  params: empty,
})

export const updateBranchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160).optional(),
    location: optionalString,
    image: optionalString,
    imageUrl: optionalString,
    manager: managerUpdateSchema.optional(),
    managerName: optionalString,
    managerEmail: optionalString,
    managerContact: optionalString,
    managerOtherContact: optionalString,
    managerGender: genderSchema,
    managerAddress: optionalString,
    profileImage: optionalString,
    managerProfileImage: optionalString,
  }),
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})

export const branchStatusSchema = z.object({
  body: z.object({
    status: z.enum([BRANCH_STATUS.OPEN, BRANCH_STATUS.BLOCKED]),
  }),
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})

export const resetPasswordSchema = z.object({
  body: z
    .object({
      /** Optional override for testing; otherwise server auto-generates. */
      password: z.string().min(8).max(72).optional(),
    })
    .optional()
    .default({}),
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})
