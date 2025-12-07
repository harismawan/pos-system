/**
 * Reports schemas for request validation
 */

import { t } from "elysia";
import { commonSchemas } from "../../libs/validation.js";

// Date range query for reports
const dateRangeQuery = {
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  outletId: t.Optional(t.String()),
};

// GET /reports/sales-summary
export const salesSummarySchema = {
  query: t.Object({
    ...dateRangeQuery,
    groupBy: t.Optional(
      t.Union([t.Literal("day"), t.Literal("week"), t.Literal("month")]),
    ),
  }),
};

// GET /reports/top-products
export const topProductsSchema = {
  query: t.Object({
    ...dateRangeQuery,
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 10 })),
    sortBy: t.Optional(t.Union([t.Literal("revenue"), t.Literal("quantity")])),
  }),
};

// GET /reports/inventory-valuation
export const inventoryValuationSchema = {
  query: t.Object({
    warehouseId: t.Optional(t.String()),
    category: t.Optional(t.String()),
  }),
};

// GET /reports/stock-movements
export const stockMovementsSchema = {
  query: t.Object({
    ...dateRangeQuery,
    warehouseId: t.Optional(t.String()),
    type: t.Optional(
      t.Union([
        t.Literal("PURCHASE"),
        t.Literal("SALE"),
        t.Literal("TRANSFER"),
        t.Literal("ADJUSTMENT_IN"),
        t.Literal("ADJUSTMENT_OUT"),
      ]),
    ),
    ...commonSchemas.pagination,
  }),
};

// GET /reports/order-history
export const orderHistorySchema = {
  query: t.Object({
    ...dateRangeQuery,
    status: t.Optional(
      t.Union([
        t.Literal("OPEN"),
        t.Literal("COMPLETED"),
        t.Literal("CANCELLED"),
      ]),
    ),
    customerId: t.Optional(t.String()),
    ...commonSchemas.pagination,
  }),
};
