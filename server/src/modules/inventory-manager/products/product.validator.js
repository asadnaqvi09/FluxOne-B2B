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

// Combination parts — typeId/valueId may be catalog UUIDs or custom temp ids
const variantPartSchema = z.object({
  typeId: z.string().min(1).optional(),
  typeName: z.string().min(1),
  valueId: z.string().min(1).optional(),
  valueName: z.string().min(1),
  isCustomType: optionalBool,
  isCustomValue: optionalBool,
})

const variantSkuSchema = z.object({
  label: z.string().min(1),
  itemCode: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().min(1),
  purchasePrice: z.coerce.number().int().nonnegative(),
  sellingPrice: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().nonnegative().optional().default(0),
  reorderPoint: z.coerce.number().int().nonnegative().optional(),
  dailyPriceChange: optionalBool,
  status: z
    .enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE])
    .optional()
    .default(PRODUCT_STATUS.ACTIVE),
  parts: z.array(variantPartSchema).min(1),
})

export const createProductSchema = z
  .object({
    body: z.object({
      name: z.string().min(1),
      categoryId: optionalLooseUuid,
      subcategoryId: optionalLooseUuid,
      type: z
        .enum([PRODUCT_TYPES.SINGLE, PRODUCT_TYPES.BUNDLE, PRODUCT_TYPES.VARIANT])
        .default(PRODUCT_TYPES.SINGLE),
      scale: z.string().min(1).optional().default('unit'),
      description: z.string().optional(),
      // Optional — system generates when omitted
      itemCode: z.string().min(1).optional(),
      sku: z.string().min(1).optional(),
      barcode: z.string().min(1).optional(),
      purchasePrice: z.coerce.number().int().nonnegative().optional(),
      sellingPrice: z.coerce.number().int().nonnegative().optional(),
      taxIds: z.array(looseUuid).optional(),
      offerId: optionalLooseUuid,
      discountPercent: z.coerce.number().int().min(0).max(100).optional(),
      confirmed: z.coerce.boolean().optional(),
      // Opening stock (single) or finished bundle count
      quantity: z.coerce.number().int().nonnegative().optional(),
      reorderPoint: z.coerce.number().int().nonnegative().optional(),
      dailyPriceChange: optionalBool,
      bundleItems: z
        .array(
          z.object({
            itemId: looseUuid,
            quantity: z.coerce.number().int().positive(),
          }),
        )
        .optional(),
      variants: z.array(variantSkuSchema).optional(),
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
    ({ body }) =>
      body.type !== PRODUCT_TYPES.BUNDLE ||
      (body.quantity !== undefined && Number(body.quantity) >= 1),
    {
      message: 'Bundle Quantity must be at least 1 when creating a bundle',
      path: ['body', 'quantity'],
    },
  )
  .refine(
    ({ body }) => body.type === PRODUCT_TYPES.BUNDLE || Boolean(body.categoryId),
    {
      message: 'categoryId is required for single and variant items',
      path: ['body', 'categoryId'],
    },
  )
  .refine(
    ({ body }) =>
      body.type !== PRODUCT_TYPES.VARIANT || (Array.isArray(body.variants) && body.variants.length > 0),
    {
      message: 'Variant products require at least one combination (variants)',
      path: ['body', 'variants'],
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
          quantity: z.coerce.number().int().nonnegative().optional(),
          scale: z.string().optional(),
          purchasePrice: z.coerce.number().int().nonnegative().optional(),
          sellingPrice: z.coerce.number().int().nonnegative().optional(),
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

const variantSkuUpdateSchema = z.object({
  id: optionalLooseUuid,
  label: z.string().min(1),
  itemCode: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().min(1),
  purchasePrice: z.coerce.number().int().nonnegative(),
  sellingPrice: z.coerce.number().int().nonnegative(),
  // Opening stock only for NEW child SKUs (existing stock via Control)
  quantity: z.coerce.number().int().nonnegative().optional(),
  reorderPoint: z.coerce.number().int().nonnegative().optional(),
  dailyPriceChange: optionalBool,
  status: z.enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE]).optional(),
  parts: z.array(variantPartSchema).min(1),
})

export const updateProductSchema = z
  .object({
    body: z.object({
      name: z.string().min(1).optional(),
      categoryId: optionalLooseUuid,
      subcategoryId: nullableLooseUuid,
      type: z
        .enum([PRODUCT_TYPES.SINGLE, PRODUCT_TYPES.BUNDLE, PRODUCT_TYPES.VARIANT])
        .optional(),
      status: z
        .enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE, 'open', 'close'])
        .optional()
        .transform((value) => {
          if (value === undefined) return undefined
          if (value === 'open') return PRODUCT_STATUS.ACTIVE
          if (value === 'close') return PRODUCT_STATUS.INACTIVE
          return value
        }),
      sellingPrice: z.coerce.number().int().nonnegative().optional(),
      purchasePrice: z.coerce.number().int().nonnegative().optional(),
      itemCode: z.string().min(1).optional(),
      sku: z.string().min(1).optional(),
      barcode: z.string().min(1).optional(),
      reorderPoint: z.coerce.number().int().nonnegative().optional(),
      dailyPriceChange: optionalBool,
      discountPercent: z.preprocess(
        (v) => (v === '' || v === undefined ? undefined : v === null ? null : v),
        z.coerce.number().int().min(0).max(100).nullable().optional(),
      ),
      offerId: nullableLooseUuid,
      description: z.string().optional(),
      scale: z.string().min(1).optional(),
      taxIds: z.array(looseUuid).optional(),
      // Finished bundle stock — changing this assembles / disassembles components
      quantity: z.coerce.number().int().nonnegative().optional(),
      bundleItems: z
        .array(
          z.object({
            itemId: looseUuid,
            quantity: z.coerce.number().int().positive(),
          }),
        )
        .optional(),
      variants: z.array(variantSkuUpdateSchema).optional(),
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
