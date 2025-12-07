/**
 * Suppliers routes
 */

import { Elysia } from "elysia";
import * as suppliersController from "./suppliers.controller.js";
import * as suppliersSchemas from "./suppliers.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const suppliersRoutes = new Elysia({ prefix: "/suppliers" })
  .use(withRequestLogger())
  .get("/", suppliersController.getSuppliersController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_SUPPLIERS),
    ],
    ...suppliersSchemas.getSuppliersQuerySchema,
  })
  .get("/:id", suppliersController.getSupplierByIdController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_SUPPLIERS),
    ],
    ...suppliersSchemas.supplierIdParamSchema,
  })
  .post("/", suppliersController.createSupplierController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_SUPPLIERS),
    ],
    ...suppliersSchemas.createSupplierBodySchema,
  })
  .put("/:id", suppliersController.updateSupplierController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_SUPPLIERS),
    ],
    ...suppliersSchemas.updateSupplierBodySchema,
  })
  .delete("/:id", suppliersController.deleteSupplierController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_SUPPLIERS),
    ],
    ...suppliersSchemas.supplierIdParamSchema,
  });
