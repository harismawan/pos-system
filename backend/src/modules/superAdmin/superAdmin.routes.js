/**
 * Super Admin routes
 * All routes require SUPER_ADMIN permissions
 */

import { Elysia } from "elysia";
import * as superAdminController from "./superAdmin.controller.js";
import * as superAdminSchemas from "./superAdmin.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const superAdminRoutes = new Elysia({ prefix: "/super-admin" })
  .use(withRequestLogger())

  // ============================================
  // DASHBOARD
  // ============================================
  .get("/dashboard", superAdminController.getDashboardController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SUPER_ADMIN_DASHBOARD),
    ],
  })

  // ============================================
  // BUSINESS MANAGEMENT
  // ============================================
  .get("/businesses", superAdminController.getBusinessesController, {
    ...superAdminSchemas.getBusinessesSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SUPER_ADMIN_BUSINESSES),
    ],
  })
  .get("/businesses/:id", superAdminController.getBusinessByIdController, {
    ...superAdminSchemas.getBusinessByIdSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SUPER_ADMIN_BUSINESSES),
    ],
  })
  .put(
    "/businesses/:id/status",
    superAdminController.updateBusinessStatusController,
    {
      ...superAdminSchemas.updateBusinessStatusSchema,
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.SUPER_ADMIN_BUSINESSES),
      ],
    },
  )

  // ============================================
  // USER MANAGEMENT
  // ============================================
  .get("/users", superAdminController.getAllUsersController, {
    ...superAdminSchemas.getAllUsersSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SUPER_ADMIN_USERS),
    ],
  })
  .get("/users/:id", superAdminController.getUserByIdController, {
    ...superAdminSchemas.getUserByIdSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SUPER_ADMIN_USERS),
    ],
  })
  .put(
    "/users/:id/reset-password",
    superAdminController.forcePasswordResetController,
    {
      ...superAdminSchemas.forcePasswordResetSchema,
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.SUPER_ADMIN_USERS),
      ],
    },
  )
  .put("/users/:id/status", superAdminController.updateUserStatusController, {
    ...superAdminSchemas.updateUserStatusSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SUPER_ADMIN_USERS),
    ],
  })

  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  .get("/users/:id/sessions", superAdminController.getUserSessionsController, {
    ...superAdminSchemas.getUserSessionsSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SUPER_ADMIN_SESSIONS),
    ],
  })
  .delete(
    "/users/:id/sessions",
    superAdminController.revokeAllSessionsController,
    {
      ...superAdminSchemas.revokeAllSessionsSchema,
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.SUPER_ADMIN_SESSIONS),
      ],
    },
  )
  .delete(
    "/users/:id/sessions/:sessionId",
    superAdminController.revokeSessionController,
    {
      ...superAdminSchemas.revokeSessionSchema,
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.SUPER_ADMIN_SESSIONS),
      ],
    },
  )

  // ============================================
  // IMPERSONATION
  // ============================================
  .post(
    "/users/:id/impersonate",
    superAdminController.impersonateUserController,
    {
      ...superAdminSchemas.impersonateUserSchema,
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.SUPER_ADMIN_IMPERSONATE),
      ],
    },
  );
