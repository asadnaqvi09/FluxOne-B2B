import { z } from 'zod'
import { empty } from '../shared.validator.js'

export const performanceSchema = z.object({
  body: z.object({
    staffId: z.string().uuid(),
    scaleId: z.string().uuid(),
    // Actual score must be non-negative; max is enforced against the factor in the controller
    points: z.coerce.number().int().nonnegative(),
  }),
  query: empty,
  params: empty,
})
