import { z } from 'zod'
import { SALE_STATUS } from '../../config/constants.js'

/** Accept demo/seed UUID-shaped ids (Zod 4 z.uuid() is RFC-4122 strict). */
const idSchema = z.guid()

export const saleLineSchema = z.object({
  productId: idSchema,
  quantity: z.coerce.number().positive(),
  scale: z.string().min(1).optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  lineTotal: z.coerce.number().nonnegative().optional(),
  isExchange: z.boolean().optional(),
})

export const salePayloadSchema = z.object({
  localSaleId: z.string().optional(),
  saleNumber: z.string().optional(),
  soldAt: z.string().optional(),
  counterCode: z.string().optional(),
  staffUserId: idSchema.optional(),
  paymentMethod: z.string().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  finalAmount: z.coerce.number().nonnegative().optional(),
  paidAmount: z.coerce.number().nonnegative().optional(),
  returnAmount: z.coerce.number().nonnegative().optional(),
  originalInvoiceId: z.string().optional(),
  status: z
    .enum([
      SALE_STATUS.COMPLETED,
      SALE_STATUS.REFUNDED,
      SALE_STATUS.PARTIAL_REFUND,
      SALE_STATUS.VOID,
    ])
    .optional(),
  lines: z.array(saleLineSchema).min(1),
  reason: z.string().optional(),
})

export const productPricePayloadSchema = z.object({
  productId: idSchema,
  sellingPrice: z.coerce.number().nonnegative(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  branchId: idSchema.optional(),
  currency: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedByUserId: idSchema.optional(),
  source: z.string().optional(),
  deviceId: z.string().optional(),
})

export const SYNC_EVENT_TYPES = /** @type {const} */ ([
  'sale',
  'refund',
  'cashier_log',
  'attendance',
  'product_price_update',
  'price_change',
])

export const syncEventSchema = z.object({
  clientEventId: z.string().min(1),
  eventType: z.enum(SYNC_EVENT_TYPES),
  payload: z.record(z.string(), z.any()),
  deviceId: z.string().optional(),
})

export const pushBodySchema = z.object({
  deviceId: z.string().optional(),
  branchId: idSchema.optional(),
  events: z.array(syncEventSchema).min(1),
})

export const bootstrapQuerySchema = z.object({
  branchId: idSchema,
})

export const deltaQuerySchema = z.object({
  branchId: idSchema,
  since: z.string().min(1),
})

/** Map POS field names to cloud schema before validation. */
export function normalizePosSalePayload(raw = {}) {
  const payload = { ...raw }

  if (Array.isArray(raw.items) && !raw.lines) {
    payload.lines = raw.items
  }

  if (raw.cashierId && !payload.staffUserId) {
    payload.staffUserId = raw.cashierId
  }

  if (raw.invoiceId && !payload.saleNumber) {
    payload.saleNumber = raw.invoiceId
  }

  if (raw.discount !== undefined && payload.discountAmount === undefined) {
    payload.discountAmount = raw.discount
  }
  if (raw.tax !== undefined && payload.taxAmount === undefined) {
    payload.taxAmount = raw.tax
  }
  if (raw.total !== undefined && payload.finalAmount === undefined) {
    payload.finalAmount = raw.total
  }
  if (raw.tendered !== undefined && payload.paidAmount === undefined) {
    payload.paidAmount = raw.tendered
  }
  if (raw.changeDue !== undefined && payload.returnAmount === undefined) {
    payload.returnAmount = raw.changeDue
  }

  if (raw.refundAmount !== undefined && payload.finalAmount === undefined) {
    payload.finalAmount = raw.refundAmount
  }

  if (Array.isArray(payload.lines)) {
    payload.lines = payload.lines.map((line) => ({
      ...line,
      discountAmount: line.discountAmount ?? line.discount,
      taxAmount: line.taxAmount ?? line.tax,
    }))
  }

  return payload
}

/** Normalize POS Items Rate / price push aliases. */
export function normalizePosPricePayload(raw = {}) {
  const payload = { ...raw }

  const productId = raw.productId ?? raw.product_id ?? raw.id
  if (productId && !payload.productId) payload.productId = productId

  const sellingPrice = raw.sellingPrice ?? raw.selling_price ?? raw.price
  if (sellingPrice !== undefined && payload.sellingPrice === undefined) {
    payload.sellingPrice = sellingPrice
  }

  const discountPercent = raw.discountPercent ?? raw.discount_percent ?? raw.discount
  if (discountPercent !== undefined && payload.discountPercent === undefined) {
    payload.discountPercent = discountPercent
  }

  const branchId = raw.branchId ?? raw.branch_id
  if (branchId && !payload.branchId) payload.branchId = branchId

  const updatedAt = raw.updatedAt ?? raw.updated_at
  if (updatedAt && !payload.updatedAt) payload.updatedAt = updatedAt

  const updatedByUserId = raw.updatedByUserId ?? raw.updated_by_user_id
  if (updatedByUserId && !payload.updatedByUserId) payload.updatedByUserId = updatedByUserId

  return payload
}

export function normalizeSyncEventPayload(eventType, payload) {
  if (eventType === 'sale' || eventType === 'refund') {
    return normalizePosSalePayload(payload)
  }
  if (eventType === 'product_price_update' || eventType === 'price_change') {
    return normalizePosPricePayload(payload)
  }
  return payload || {}
}

export function validateSalePayload(payload) {
  const normalized = normalizePosSalePayload(payload)
  return salePayloadSchema.safeParse(normalized)
}

export function validateRefundPayload(payload) {
  const normalized = normalizePosSalePayload(payload)
  const parsed = salePayloadSchema.safeParse(normalized)
  if (!parsed.success) return parsed
  const status = parsed.data.status
  if (status && status !== SALE_STATUS.REFUNDED && status !== SALE_STATUS.PARTIAL_REFUND) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          message: 'Refund events require status refunded or partial_refund',
          path: ['status'],
        },
      ]),
    }
  }
  return parsed
}

export function validateProductPricePayload(payload) {
  const normalized = normalizePosPricePayload(payload)
  return productPricePayloadSchema.safeParse(normalized)
}

export function parseSchemaOrThrow(schema, data, label = 'Request') {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join('; ') || `${label} validation failed`
    const err = new Error(message)
    err.status = 422
    throw err
  }
  return result.data
}
