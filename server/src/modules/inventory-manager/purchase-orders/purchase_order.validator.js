import { z } from 'zod'
import { empty, idParams, paginationQuery } from '../shared.validator.js'

export const listOrdersSchema = z.object({
  body: empty,
  params: empty,
  query: paginationQuery.extend({
    q: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    status: z.enum(['pending', 'approved', 'received', 'cancelled']).optional(),
  }),
})

export const generateOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid(),
    explanation: z.string().optional(),
    sendSms: z.coerce.boolean().optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.coerce.number().int().positive(),
          unitCost: z.coerce.number().int().nonnegative(),
          scale: z.string().min(1),
        }),
      )
      .min(1),
  }),
  query: empty,
  params: empty,
})

export const orderIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: idParams,
})
