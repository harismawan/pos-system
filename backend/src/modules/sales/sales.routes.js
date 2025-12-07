/**
 * Sales routes
 */

import { Elysia } from "elysia";
import * as salesController from "./sales.controller.js";
import * as salesSchemas from "./sales.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const salesRoutes = new Elysia({ prefix: "/sales" })
  .use(withRequestLogger())
  .post("/orders", salesController.createPosOrderController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.POS_ACCESS)],
    ...salesSchemas.createPosOrderBodySchema,
  })
  .get("/orders", salesController.getPosOrdersController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.POS_ACCESS)],
    ...salesSchemas.getPosOrdersQuerySchema,
  })
  .get("/orders/:id", salesController.getPosOrderByIdController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.POS_ACCESS)],
    ...salesSchemas.posOrderIdParamSchema,
  })
  .post("/orders/:id/complete", salesController.completePosOrderController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.POS_ACCESS)],
    ...salesSchemas.posOrderIdParamSchema,
  })
  .post("/orders/:id/cancel", salesController.cancelPosOrderController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.POS_VOID)],
    ...salesSchemas.posOrderIdParamSchema,
  })
  .post("/orders/:id/payments", salesController.addPaymentController, {
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.POS_ACCESS)],
    ...salesSchemas.addPaymentBodySchema,
  });
