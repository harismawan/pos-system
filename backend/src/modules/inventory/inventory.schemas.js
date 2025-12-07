/**
 * Inventory schemas for request validation
 */

import { t } from "elysia";
import { commonSchemas } from "../../libs/validation.js";

// GET /inventory query parameters
export const getInventoryQuerySchema = {
  query: t.Object({
    warehouseId: t.Optional(t.String()),
    productId: t.Optional(t.String()),
    lowStock: commonSchemas.booleanString,
    ...commonSchemas.pagination,
  }),
};

// POST /inventory/adjust body
export const adjustInventoryBodySchema = {
  body: t.Object({
    productId: t.String(),
    warehouseId: t.String(),
    type: t.Union([t.Literal("ADJUSTMENT_IN"), t.Literal("ADJUSTMENT_OUT")]),
    quantity: t.Numeric(),
    notes: t.Optional(t.String()),
  }),
};

// POST /inventory/transfer body
export const transferInventoryBodySchema = {
  body: t.Object({
    productId: t.String(),
    fromWarehouseId: t.String(),
    toWarehouseId: t.String(),
    quantity: t.Numeric({ minimum: 0.01 }),
    notes: t.Optional(t.String()),
  }),
};

// GET /inventory/movements query
export const getStockMovementsQuerySchema = {
  query: t.Object({
    productId: t.Optional(t.String()),
    outletId: t.Optional(t.String()),
    type: t.Optional(
      t.Union([
        t.Literal("PURCHASE"),
        t.Literal("SALE"),
        t.Literal("TRANSFER"),
        t.Literal("ADJUSTMENT_IN"),
        t.Literal("ADJUSTMENT_OUT"),
      ]),
    ),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
    ...commonSchemas.pagination,
  }),
};
