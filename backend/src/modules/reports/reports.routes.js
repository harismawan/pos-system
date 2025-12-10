/**
 * Reports routes
 */

import { Elysia } from "elysia";
import * as reportsController from "./reports.controller.js";
import * as reportsSchemas from "./reports.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const reportsRoutes = new Elysia({ prefix: "/reports" })
  .use(withRequestLogger())
  .get("/top-products", reportsController.getTopProductsController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.REPORTS_VIEW)],
    ...reportsSchemas.topProductsSchema,
  })
  .get(
    "/inventory-valuation",
    reportsController.getInventoryValuationController,
    {
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.REPORTS_VIEW),
      ],
      ...reportsSchemas.inventoryValuationSchema,
    },
  )
  .get("/stock-movements", reportsController.getStockMovementsController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.REPORTS_VIEW)],
    ...reportsSchemas.stockMovementsSchema,
  })
  .get("/order-history", reportsController.getOrderHistoryController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.REPORTS_VIEW)],
    ...reportsSchemas.orderHistorySchema,
  })
  .get("/sales-trend", reportsController.getSalesTrendController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.REPORTS_VIEW)],
    ...reportsSchemas.salesTrendSchema,
  })
  .get("/hourly-heatmap", reportsController.getHourlySalesHeatmapController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.REPORTS_VIEW)],
    ...reportsSchemas.heatmapSchema,
  });
