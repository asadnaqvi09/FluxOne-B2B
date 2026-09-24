import { z } from 'zod'
import { empty, idParams, optionalString, optionalUuid } from '../shared.validator.js'

const hardwareType = z.enum(['Computers', 'Scanners', 'Printers', 'Telephone', 'Other'])
const hardwareStatus = z.enum(['New', 'Used', 'Good', 'Poor'])

// Multipart sends strings — coerce empty to undefined
const optionalImageUrl = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.string().max(500).optional(),
)

export const listHardwareSchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    branchId: optionalUuid,
    type: hardwareType.optional(),
    q: optionalString,
  }),
})

export const createHardwareSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    companyName: z.string().trim().max(120).optional().nullable(),
    type: hardwareType,
    status: hardwareStatus.optional().default('New'),
    branchId: optionalUuid,
    assignedToStaffId: optionalUuid,
    imageUrl: optionalImageUrl,
  }),
  query: empty,
  params: empty,
})

export const updateHardwareSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    companyName: z.string().trim().max(120).optional().nullable(),
    type: hardwareType.optional(),
    status: hardwareStatus.optional(),
    branchId: optionalUuid,
    assignedToStaffId: optionalUuid,
    imageUrl: optionalImageUrl,
  }),
  query: empty,
  params: idParams,
})

export const hardwareIdParamsSchema = z.object({
  body: empty,
  query: z.object({ branchId: optionalUuid }),
  params: idParams,
})

export const listItemScalesSchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    q: optionalString,
  }),
})

export const createItemScaleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    code: optionalString,
  }),
  query: empty,
  params: empty,
})

export const updateItemScaleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    code: optionalString,
  }),
  query: empty,
  params: idParams,
})

export const itemScaleIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: idParams,
})
