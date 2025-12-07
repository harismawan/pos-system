/**
 * Products schemas for request validation
 */

import { t } from "elysia";
import { commonSchemas } from "../../libs/validation.js";

// GET /products query parameters
export const getProductsQuerySchema = {
  query: t.Object({
    search: t.Optional(t.String({ maxLength: 100 })),
    category: t.Optional(t.String({ maxLength: 50 })),
    isActive: commonSchemas.booleanString,
    outletId: t.Optional(t.String()),
    ...commonSchemas.pagination,
  }),
};

// GET /products/:id params
export const productIdParamSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

// POST /products body
export const createProductBodySchema = {
  body: t.Object({
    sku: t.String({ minLength: 1, maxLength: 50 }),
    barcode: t.Optional(t.String({ maxLength: 50 })),
    name: t.String({ minLength: 1, maxLength: 255 }),
    description: t.Optional(t.String()),
    category: t.Optional(t.String({ maxLength: 50 })),
    unit: t.String({ default: "pcs", maxLength: 20 }),
    basePrice: t.Numeric({ minimum: 0 }),
    costPrice: t.Optional(t.Numeric({ minimum: 0 })),
    taxRate: t.Optional(t.Numeric({ minimum: 0, maximum: 100 })),
    isActive: t.Optional(t.Boolean({ default: true })),
  }),
};

// PUT /products/:id body
export const updateProductBodySchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Partial(
    t.Object({
      sku: t.String({ minLength: 1, maxLength: 50 }),
      barcode: t.String({ maxLength: 50 }),
      name: t.String({ minLength: 1, maxLength: 255 }),
      description: t.String(),
      category: t.String({ maxLength: 50 }),
      unit: t.String({ maxLength: 20 }),
      basePrice: t.Numeric({ minimum: 0 }),
      costPrice: t.Numeric({ minimum: 0 }),
      taxRate: t.Numeric({ minimum: 0, maximum: 100 }),
      isActive: t.Boolean(),
    }),
  ),
};
