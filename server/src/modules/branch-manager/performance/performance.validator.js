import { z } from 'zod'
import { empty, idParams } from '../shared.validator.js'

const optionalBool = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return value
}, z.boolean().optional())

// Score a staff member against one enabled scale factor
export const scoreStaffSchema = z.object({
  body: z.object({
    staffId: z.string().uuid(),
    scaleId: z.string().uuid(),
    // Actual score must be non-negative; max is enforced against the factor in the controller
    points: z.coerce.number().int().nonnegative(),
  }),
  query: empty,
  params: empty,
})

// Back-compat alias used by older imports
export const performanceSchema = scoreStaffSchema

export const listScalesSchema = z.object({
  body: empty,
  query: empty,
  params: empty,
})

export const listScoresSchema = z.object({
  body: empty,
  query: empty,
  params: empty,
})

export const createScaleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    maxPoints: z.coerce.number().int().min(1),
    isActive: optionalBool,
  }),
  query: empty,
  params: empty,
})

export const updateScaleSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      maxPoints: z.coerce.number().int().min(1).optional(),
      isActive: optionalBool,
    })
    .refine(
      (body) =>
        body.name !== undefined ||
        body.maxPoints !== undefined ||
        body.isActive !== undefined,
      { message: 'Provide name, maxPoints, and/or isActive' },
    ),
  query: empty,
  params: idParams,
})

export const scaleIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: idParams,
})
