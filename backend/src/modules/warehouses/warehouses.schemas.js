/**
 * Warehouses schemas for request validation
 */

import { t } from "elysia";
import { commonSchemas, addressFields } from "../../libs/validation.js";

// GET /warehouses query parameters
export const getWarehousesQuerySchema = {
  query: t.Object({
    outletId: t.Optional(t.String()),
    type: t.Optional(t.Union([t.Literal("CENTRAL"), t.Literal("OUTLET")])),
    isActive: commonSchemas.booleanString,
    ...commonSchemas.pagination,
  }),
};

// GET /warehouses/:id params
export const warehouseIdParamSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

// POST /warehouses body
export const createWarehouseBodySchema = {
  body: t.Object({
    outletId: t.Optional(t.String()),
    name: t.String({ minLength: 1, maxLength: 255 }),
    code: t.String({ minLength: 1, maxLength: 50 }),
    ...addressFields,
    type: t.Optional(t.Union([t.Literal("CENTRAL"), t.Literal("OUTLET")])),
    isDefault: t.Optional(t.Boolean({ default: false })),
    isActive: t.Optional(t.Boolean({ default: true })),
  }),
};

// PUT /warehouses/:id body
export const updateWarehouseBodySchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Partial(
    t.Object({
      outletId: t.String(),
      name: t.String({ minLength: 1, maxLength: 255 }),
      code: t.String({ minLength: 1, maxLength: 50 }),
      addressLine1: t.String({ maxLength: 255 }),
      addressLine2: t.String({ maxLength: 255 }),
      city: t.String({ maxLength: 100 }),
      state: t.String({ maxLength: 100 }),
      postalCode: t.String({ maxLength: 20 }),
      country: t.String({ maxLength: 100 }),
      type: t.Union([t.Literal("CENTRAL"), t.Literal("OUTLET")]),
      isDefault: t.Boolean(),
      isActive: t.Boolean(),
    }),
  ),
};

// GET /warehouses/:id/inventory query
export const getWarehouseInventoryQuerySchema = {
  params: t.Object({
    id: t.String(),
  }),
  query: t.Object({
    lowStock: commonSchemas.booleanString,
    ...commonSchemas.pagination,
  }),
};
