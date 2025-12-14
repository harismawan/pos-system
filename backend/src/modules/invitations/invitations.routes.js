/**
 * Invitations routes
 * Public and protected endpoints for user invitations
 */

import { Elysia } from "elysia";
import * as invitationsController from "./invitations.controller.js";
import * as invitationsSchemas from "./invitations.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const invitationsRoutes = new Elysia({ prefix: "/invitations" })
  .use(withRequestLogger())

  // ============================================
  // PUBLIC ENDPOINTS (no auth required)
  // ============================================

  // Verify invitation token
  .get("/verify/:token", invitationsController.verifyInvitationController, {
    ...invitationsSchemas.verifyInvitationSchema,
  })

  // Accept invitation and create account
  .post("/accept", invitationsController.acceptInvitationController, {
    ...invitationsSchemas.acceptInvitationSchema,
  })

  // ============================================
  // PROTECTED ENDPOINTS (auth required)
  // ============================================

  // List invitations for business
  .get("/", invitationsController.getInvitationsController, {
    ...invitationsSchemas.getInvitationsSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.INVITATIONS_VIEW),
    ],
  })

  // Create invitation
  .post("/", invitationsController.createInvitationController, {
    ...invitationsSchemas.createInvitationSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.INVITATIONS_CREATE),
    ],
  })

  // Cancel invitation
  .delete("/:id", invitationsController.cancelInvitationController, {
    ...invitationsSchemas.cancelInvitationSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.INVITATIONS_CANCEL),
    ],
  })

  // Resend invitation
  .post("/:id/resend", invitationsController.resendInvitationController, {
    ...invitationsSchemas.resendInvitationSchema,
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.INVITATIONS_CREATE),
    ],
  });
