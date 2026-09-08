import { z } from 'zod'
import { empty, optionalString, paginationQuery } from '../../branch-manager/shared.validator.js'

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
