/**
 * Audit Logs routes
 */

import { Elysia } from "elysia";
import * as auditLogsController from "./auditLogs.controller.js";
import * as auditLogsSchemas from "./auditLogs.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const auditLogsRoutes = new Elysia({ prefix: "/audit-logs" })
  .use(withRequestLogger())
  .get("/", auditLogsController.getAuditLogsController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_AUDIT),
    ],
    ...auditLogsSchemas.getAuditLogsQuerySchema,
  })
  .get("/event-types", auditLogsController.getEventTypesController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_AUDIT),
    ],
  })
  .get("/entity-types", auditLogsController.getEntityTypesController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_AUDIT),
    ],
  })
  .get("/:id", auditLogsController.getAuditLogByIdController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_AUDIT),
    ],
    ...auditLogsSchemas.auditLogIdParamSchema,
  });
