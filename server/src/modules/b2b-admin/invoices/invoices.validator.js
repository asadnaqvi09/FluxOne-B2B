import { z } from 'zod'
import { empty, optionalString, paginationQuery } from '../../branch-manager/shared.validator.js'

const looseUuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid invoice id',
  )

export const listInvoicesQuerySchema = z.object({
  body: empty,
  params: empty,
  query: paginationQuery.extend({
    q: optionalString,
    month: z.preprocess(
      (value) => (value === '' || value === null || value === undefined || value === 'all' ? undefined : value),
      z
        .string()
        .regex(/^(0?[1-9]|1[0-2])$/, 'Invalid month')
        .optional(),
    ),
    year: z.preprocess(
      (value) => (value === '' || value === null || value === undefined || value === 'all' ? undefined : value),
      z.coerce.number().int().min(2000).max(2100).optional(),
    ),
  }),
})

export const invoiceIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})

export const invoicesSummarySchema = z.object({
  body: empty,
  params: empty,
  query: empty,
})
