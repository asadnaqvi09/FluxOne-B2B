import { z } from 'zod'
import { empty, timeString } from '../../branch-manager/shared.validator.js'
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

// Empty string / null clears hours; omit (undefined) leaves existing value on patch.
const branchHourTime = z.preprocess((value) => {
  if (value === undefined) return undefined
  if (value === '' || value === null) return null
  return value
}, z.union([timeString, z.null()]).optional())

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

function parseTimeToMinutes(value) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function hasValue(value) {
  return value != null && String(value).trim() !== ''
}

// Both empty OK; both set requires open < close (Phase 1: no overnight).
function refineBranchHours(body, ctx) {
  const hasOpen = hasValue(body.openingTime)
  const hasClose = hasValue(body.closingTime)

  if (hasOpen !== hasClose) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Set both opening and closing time, or leave both empty',
      path: ['body', hasOpen ? 'closingTime' : 'openingTime'],
    })
    return
  }

  if (!hasOpen) return

  const open = parseTimeToMinutes(body.openingTime)
  const close = parseTimeToMinutes(body.closingTime)
  if (open == null || close == null) return
  if (open >= close) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Closing time must be after opening time',
      path: ['body', 'closingTime'],
    })
  }
}

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

export const createBranchSchema = z
  .object({
    body: z.object({
      name: z.string().trim().min(1).max(160),
      location: optionalString,
      image: optionalString,
      imageUrl: optionalString,
      status: z.enum([BRANCH_STATUS.OPEN, BRANCH_STATUS.BLOCKED]).optional(),
      openingTime: branchHourTime,
      closingTime: branchHourTime,
      // Nested manager, or flat manager* fields accepted in controller normalize.
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
  .superRefine(({ body }, ctx) => {
    refineBranchHours(body, ctx)
  })

export const updateBranchSchema = z
  .object({
    body: z.object({
      name: z.string().trim().min(1).max(160).optional(),
      location: optionalString,
      image: optionalString,
      imageUrl: optionalString,
      openingTime: branchHourTime,
      closingTime: branchHourTime,
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
  .superRefine(({ body }, ctx) => {
    // Only validate the pair when either hour field is present in the patch.
    if (body.openingTime !== undefined || body.closingTime !== undefined) {
      refineBranchHours(body, ctx)
    }
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
      // Optional override for testing; otherwise server auto-generates.
      password: z.string().min(8).max(72).optional(),
    })
    .optional()
    .default({}),
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})
