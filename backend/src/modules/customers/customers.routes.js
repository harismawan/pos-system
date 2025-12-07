/**
 * Customers routes
 */

import { Elysia } from "elysia";
import * as customersController from "./customers.controller.js";
import * as customersSchemas from "./customers.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const customersRoutes = new Elysia({ prefix: "/customers" })
  .use(withRequestLogger())
  .get("/", customersController.getCustomersController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_CUSTOMERS),
    ],
    ...customersSchemas.getCustomersQuerySchema,
  })
  .get("/:id", customersController.getCustomerByIdController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_CUSTOMERS),
    ],
    ...customersSchemas.customerIdParamSchema,
  })
  .post("/", customersController.createCustomerController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_CUSTOMERS),
    ],
    ...customersSchemas.createCustomerBodySchema,
  })
  .put("/:id", customersController.updateCustomerController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_CUSTOMERS),
    ],
    ...customersSchemas.updateCustomerBodySchema,
  })
  .delete("/:id", customersController.deleteCustomerController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_CUSTOMERS),
    ],
    ...customersSchemas.customerIdParamSchema,
  });
