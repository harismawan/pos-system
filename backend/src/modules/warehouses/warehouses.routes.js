/**
 * Warehouses routes
 */

import { Elysia } from "elysia";
import * as warehousesController from "./warehouses.controller.js";
import * as warehousesSchemas from "./warehouses.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const warehousesRoutes = new Elysia({ prefix: "/warehouses" })
  .use(withRequestLogger())
  .get("/", warehousesController.getWarehousesController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_WAREHOUSES),
    ],
    ...warehousesSchemas.getWarehousesQuerySchema,
  })
  .get("/:id", warehousesController.getWarehouseByIdController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_WAREHOUSES),
    ],
    ...warehousesSchemas.warehouseIdParamSchema,
  })
  .post("/", warehousesController.createWarehouseController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_WAREHOUSES),
    ],
    ...warehousesSchemas.createWarehouseBodySchema,
  })
  .put("/:id", warehousesController.updateWarehouseController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_WAREHOUSES),
    ],
    ...warehousesSchemas.updateWarehouseBodySchema,
  })
  .delete("/:id", warehousesController.deleteWarehouseController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_WAREHOUSES),
    ],
    ...warehousesSchemas.warehouseIdParamSchema,
  })
  .get("/:id/inventory", warehousesController.getWarehouseInventoryController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.INVENTORY_VIEW),
    ],
    ...warehousesSchemas.getWarehouseInventoryQuerySchema,
  });
