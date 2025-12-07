/**
 * Outlets schemas for request validation
 */

import { t } from "elysia";
import { commonSchemas, addressFields } from "../../libs/validation.js";

// GET /outlets query parameters
export const getOutletsQuerySchema = {
  query: t.Object({
    isActive: commonSchemas.booleanString,
    ...commonSchemas.pagination,
  }),
};

// GET /outlets/:id params
export const outletIdParamSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

// POST /outlets body
export const createOutletBodySchema = {
  body: t.Object({
    name: t.String({ minLength: 1, maxLength: 255 }),
    code: t.String({ minLength: 1, maxLength: 50 }),
    ...addressFields,
    phone: commonSchemas.phone,
    defaultPriceTierId: t.Optional(t.String()),
    isActive: t.Optional(t.Boolean({ default: true })),
  }),
};

// PUT /outlets/:id body
export const updateOutletBodySchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Partial(
    t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      code: t.String({ minLength: 1, maxLength: 50 }),
      addressLine1: t.String({ maxLength: 255 }),
      addressLine2: t.String({ maxLength: 255 }),
      city: t.String({ maxLength: 100 }),
      state: t.String({ maxLength: 100 }),
      postalCode: t.String({ maxLength: 20 }),
      country: t.String({ maxLength: 100 }),
      phone: t.String({ minLength: 8, maxLength: 20 }),
      defaultPriceTierId: t.String(),
      isActive: t.Boolean(),
    }),
  ),
};

// POST /outlets/:id/users body
export const assignUserBodySchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Object({
    userId: t.String(),
    outletRole: t.Union([
      t.Literal("MANAGER"),
      t.Literal("CASHIER"),
      t.Literal("WAREHOUSE_STAFF"),
    ]),
    isDefaultForUser: t.Optional(t.Boolean({ default: false })),
  }),
};

// DELETE /outlets/:id/users/:userId params
export const removeUserParamsSchema = {
  params: t.Object({
    id: t.String(),
    userId: t.String(),
  }),
};
