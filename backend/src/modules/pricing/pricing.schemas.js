/**
 * Pricing schemas for request validation
 */

import { t } from "elysia";
import { commonSchemas } from "../../libs/validation.js";

// GET /pricing/quote query
export const getPriceQuoteQuerySchema = {
  query: t.Object({
    productId: t.String(),
    priceTierId: t.Optional(t.String()),
    outletId: t.Optional(t.String()),
    quantity: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  }),
};

// GET /pricing/tiers query
export const getPriceTiersQuerySchema = {
  query: t.Object({
    ...commonSchemas.pagination,
  }),
};

// POST /pricing/tiers body
export const createPriceTierBodySchema = {
  body: t.Object({
    name: t.String({ minLength: 1, maxLength: 255 }),
    code: t.String({ minLength: 1, maxLength: 50 }),
    description: t.Optional(t.String()),
    isDefault: t.Optional(t.Boolean({ default: false })),
  }),
};

// PUT /pricing/tiers/:id body
export const updatePriceTierBodySchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Partial(
    t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      code: t.String({ minLength: 1, maxLength: 50 }),
      description: t.String(),
      isDefault: t.Boolean(),
    }),
  ),
};

// Params for price tier routes
export const priceTierIdParamSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

// Params for product prices routes
export const productIdParamSchema = {
  params: t.Object({
    productId: t.String(),
  }),
};

// POST /pricing/products/:productId/prices body
export const setProductPriceBodySchema = {
  params: t.Object({
    productId: t.String(),
  }),
  body: t.Object({
    priceTierId: t.String(),
    outletId: t.Optional(t.String()),
    price: t.Numeric({ minimum: 0 }),
  }),
};
