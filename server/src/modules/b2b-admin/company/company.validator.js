import { z } from 'zod'
import { empty } from '../../branch-manager/shared.validator.js'

const optionalString = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.string().optional(),
)

export const getCompanySchema = z.object({
  body: empty,
  query: empty,
  params: empty,
})

export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    contactNumbers: optionalString,
    whatsappNumber: optionalString,
    facebookUrl: optionalString,
    instagramUrl: optionalString,
    registrationTaxId: optionalString,
    businessAddress: optionalString,
    supportEmail: optionalString,
    logoUrl: optionalString,
  }),
  query: empty,
  params: empty,
})
