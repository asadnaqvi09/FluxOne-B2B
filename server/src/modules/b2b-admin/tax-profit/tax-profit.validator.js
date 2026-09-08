import { z } from 'zod'
import { empty, optionalString, optionalUuid, paginationQuery } from '../../branch-manager/shared.validator.js'

const looseUuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid product id',
  )

const sortEnum = z.enum(['all', 'top_sales', 'top_profit', 'slow_moving']).default('all')

const percentField = z.coerce.number().min(0).max(100)

export const listTaxProfitQuerySchema = z.object({
  body: empty,
  params: empty,
  query: paginationQuery.extend({
    q: optionalString,
    categoryId: optionalUuid,
    subcategoryId: optionalUuid,
    scale: optionalString,
    sort: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? 'all' : value),
      sortEnum,
    ),
  }),
})

export const taxProfitMetaSchema = z.object({
  body: empty,
  params: empty,
  query: empty,
})

export const bulkProfitSchema = z.object({
  body: z.object({
    productIds: z.array(looseUuid).min(1).max(500),
    profitPercent: percentField,
  }),
  query: empty,
  params: empty,
})

export const bulkTaxSchema = z.object({
  body: z.object({
    productIds: z.array(looseUuid).min(1).max(500),
    taxPercent: percentField,
  }),
  query: empty,
  params: empty,
})
