import { z } from 'zod'
import { PRODUCT_STATUS, PRODUCT_TYPES } from '../../../config/constants.js'
import {
  catalogFilters,
  empty,
  idParams,
  looseUuid,
  nullableLooseUuid,
  optionalBool,
  optionalLooseUuid,
  paginationQuery,
} from '../shared.validator.js'

export const listCatalogSchema = z.object({
  body: empty,
  params: empty,
  query: catalogFilters.merge(paginationQuery),
})

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    parentId: optionalLooseUuid,
  }),
  query: empty,
  params: empty,
})

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
  query: empty,
  params: idParams,
})

export const categoryIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: idParams,
})

export const setCategoryActiveSchema = z.object({
  body: z.object({
    isActive: z.coerce.boolean(),
  }),
  query: empty,
  params: idParams,
})

export const createProductSchema = z
  .object({
    body: z.object({
      name: z.string().min(1),
      categoryId: optionalLooseUuid,
      subcategoryId: optionalLooseUuid,
      type: z.enum([PRODUCT_TYPES.SINGLE, PRODUCT_TYPES.BUNDLE]).default(PRODUCT_TYPES.SINGLE),
      scale: z.string().min(1),
      description: z.string().optional(),
      purchasePrice: z.coerce.number().nonnegative().optional(),
      sellingPrice: z.coerce.number().nonnegative().optional(),
      taxIds: z.array(looseUuid).optional(),
      offerId: optionalLooseUuid,
      discountPercent: z.coerce.number().min(0).max(100).optional(),
      confirmed: z.coerce.boolean().optional(),
      bundleItems: z
        .array(
          z.object({
            itemId: looseUuid,
            quantity: z.coerce.number().positive(),
          }),
        )
        .optional(),
    }),
    query: empty,
    params: empty,
  })
  .refine(
    ({ body }) => body.type !== PRODUCT_TYPES.BUNDLE || (body.bundleItems && body.bundleItems.length > 0),
    {
      message: 'Bundle products require at least one bundle item',
      path: ['body', 'bundleItems'],
    },
  )
  .refine(
    ({ body }) => body.type === PRODUCT_TYPES.BUNDLE || Boolean(body.categoryId),
    {
      message: 'categoryId is required for single items',
      path: ['body', 'categoryId'],
    },
  )

export const importItemsSchema = z.object({
  body: z.object({
    rows: z
      .array(
        z.object({
          sku: z.string().min(1),
          name: z.string().min(1),
          barcode: z.string().optional(),
          type: z.enum([PRODUCT_TYPES.SINGLE, PRODUCT_TYPES.BUNDLE]).optional(),
          quantity: z.coerce.number().nonnegative().optional(),
          scale: z.string().optional(),
          purchasePrice: z.coerce.number().nonnegative().optional(),
          sellingPrice: z.coerce.number().nonnegative().optional(),
        }),
      )
      .min(1),
  }),
  query: empty,
  params: empty,
})

export const scanItemSchema = z.object({
  body: z.object({
    barcode: z.string().min(4),
  }),
  query: empty,
  params: empty,
})

export const productIdParamsSchema = z.object({
  body: empty,
  query: empty,
  params: idParams,
})

export const deleteProductSchema = z.object({
  body: empty,
  query: z.object({
    permanent: optionalBool,
  }),
  params: idParams,
})

export const updateProductSchema = z
  .object({
    body: z.object({
      name: z.string().min(1).optional(),
      categoryId: optionalLooseUuid,
      subcategoryId: nullableLooseUuid,
      type: z.enum([PRODUCT_TYPES.SINGLE, PRODUCT_TYPES.BUNDLE]).optional(),
      status: z
        .enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE, 'open', 'close'])
        .optional()
        .transform((value) => {
          if (value === undefined) return undefined
          if (value === 'open') return PRODUCT_STATUS.ACTIVE
          if (value === 'close') return PRODUCT_STATUS.INACTIVE
          return value
        }),
      sellingPrice: z.coerce.number().nonnegative().optional(),
      purchasePrice: z.coerce.number().nonnegative().optional(),
      discountPercent: z.preprocess(
        (v) => (v === '' || v === undefined ? undefined : v === null ? null : v),
        z.coerce.number().min(0).max(100).nullable().optional(),
      ),
      offerId: nullableLooseUuid,
      description: z.string().optional(),
      scale: z.string().min(1).optional(),
      taxIds: z.array(looseUuid).optional(),
      bundleItems: z
        .array(
          z.object({
            itemId: looseUuid,
            quantity: z.coerce.number().positive(),
          }),
        )
        .optional(),
    }),
    query: empty,
    params: idParams,
  })
  .refine(
    ({ body }) => body.type !== PRODUCT_TYPES.BUNDLE || (body.bundleItems && body.bundleItems.length > 0),
    {
      message: 'Bundle products require at least one bundle item',
      path: ['body', 'bundleItems'],
    },
  )
