import { z } from 'zod'
import { empty, optionalString, paginationQuery } from '../../branch-manager/shared.validator.js'
import { SUPPORTED_CURRENCIES } from '../../../utils/currency.util.js'

const currencyCodes = SUPPORTED_CURRENCIES.map((c) => c.code)

const looseUuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid device id',
  )

export const listDevicesQuerySchema = z.object({
  body: empty,
  params: empty,
  query: paginationQuery.extend({
    q: optionalString,
    status: z.preprocess(
      (value) => (value === '' || value === null || value === undefined ? 'all' : value),
      z.enum(['all', 'active', 'blocked']).default('all'),
    ),
  }),
})

export const deviceIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})

export const updateDeviceStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'blocked']),
  }),
  query: empty,
  params: z.object({
    id: looseUuid,
  }),
})

export const getCurrencySchema = z.object({
  body: empty,
  params: empty,
  query: empty,
})

export const updateCurrencySchema = z.object({
  body: z.object({
    defaultCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => currencyCodes.includes(v), {
        message: `Currency must be one of: ${currencyCodes.join(', ')}`,
      }),
  }),
  params: empty,
  query: empty,
})
