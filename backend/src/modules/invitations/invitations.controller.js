/**
 * Invitations controller - Route handlers
 */

import * as invitationsService from "./invitations.service.js";
import logger from "../../libs/logger.js";
import { INV_CODE } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

export async function createInvitationController({
  body,
  store,
  set,
  headers,
}) {
  try {
    const businessId = store.user.businessId;
    const frontendUrl = headers["origin"] || "http://localhost:5173";

    const invitation = await invitationsService.createInvitation({
      ...body,
      businessId,
      invitedBy: store.user.id,
      frontendUrl,
    });

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_INVITATION_CREATED",
        entityType: "UserInvitation",
        entityId: invitation.id,
        payload: { email: invitation.email, role: invitation.role },
      }),
    );

    set.status = 201;
    return successResponse(INV_CODE.CREATE_SUCCESS, { invitation });
  } catch (err) {
    logger.error({ err }, "Create invitation failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(INV_CODE.CREATE_FAILED, message);
  }
}

export async function getInvitationsController({ query, store, set }) {
  try {
    const { page, limit } = query;
    const businessId = store.user.businessId;

    const result = await invitationsService.getInvitations({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      businessId,
    });

    return successResponse(INV_CODE.LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get invitations failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(INV_CODE.LIST_FAILED, message);
  }
}

export async function cancelInvitationController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    await invitationsService.cancelInvitation(params.id, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_INVITATION_CANCELLED",
        entityType: "UserInvitation",
        entityId: params.id,
      }),
    );

    return successResponse(INV_CODE.CANCEL_SUCCESS, null);
  } catch (err) {
    logger.error({ err }, "Cancel invitation failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(INV_CODE.CANCEL_FAILED, message);
  }
}

export async function resendInvitationController({
  params,
  store,
  set,
  headers,
}) {
  try {
    const businessId = store.user.businessId;
    const frontendUrl = headers["origin"] || "http://localhost:5173";

    const result = await invitationsService.resendInvitation(
      params.id,
      businessId,
      frontendUrl,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_INVITATION_RESENT",
        entityType: "UserInvitation",
        entityId: params.id,
      }),
    );

    return successResponse(INV_CODE.RESEND_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Resend invitation failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(INV_CODE.RESEND_FAILED, message);
  }
}

// Public endpoints (no auth required)

export async function verifyInvitationController({ params, set }) {
  try {
    const invitation = await invitationsService.verifyInvitationToken(
      params.token,
    );
    return successResponse(INV_CODE.VERIFY_SUCCESS, { invitation });
  } catch (err) {
    logger.error({ err }, "Verify invitation failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(INV_CODE.VERIFY_FAILED, message);
  }
}

export async function acceptInvitationController({ body, set }) {
  try {
    const result = await invitationsService.acceptInvitation(body);

    // Audit Log - manually constructed as this is a public endpoint (self-registration)
    enqueueAuditLogJob({
      eventType: "USER_INVITATION_ACCEPTED",
      userId: result.user.id,
      outletId: null,
      entityType: "User",
      entityId: result.user.id,
      payload: { email: result.user.email },
      impersonatedBy: null, // New users cannot be created via impersonation in this flow
    });

    set.status = 201;
    return successResponse(INV_CODE.ACCEPT_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Accept invitation failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(INV_CODE.ACCEPT_FAILED, message);
  }
}
