/**
 * Super Admin controller - Route handlers
 */

import * as superAdminService from "./superAdmin.service.js";
import logger from "../../libs/logger.js";
import { SADM } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

// ============================================
// BUSINESS MANAGEMENT
// ============================================

export async function getBusinessesController({ query, set }) {
  try {
    const { page, limit, search, status } = query;

    const result = await superAdminService.getBusinesses({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      status,
    });

    return successResponse(SADM.BUSINESSES_LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get businesses failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.BUSINESSES_LIST_FAILED, message);
  }
}

export async function getBusinessByIdController({ params, set }) {
  try {
    const business = await superAdminService.getBusinessById(params.id);
    return successResponse(SADM.BUSINESS_GET_SUCCESS, { business });
  } catch (err) {
    logger.error({ err }, "Get business by id failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.BUSINESS_GET_FAILED, message);
  }
}

export async function updateBusinessStatusController({
  params,
  body,
  store,
  set,
}) {
  try {
    const { updated: business, previousStatus } =
      await superAdminService.updateBusinessStatus(
        params.id,
        body.status,
        store.user.id,
      );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "BUSINESS_STATUS_CHANGED",
        outletId: null,
        entityType: "Business",
        entityId: params.id,
        payload: { status: body.status, previousStatus },
      }),
    );

    return successResponse(SADM.BUSINESS_STATUS_UPDATED, { business });
  } catch (err) {
    logger.error({ err }, "Update business status failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.BUSINESS_STATUS_FAILED, message);
  }
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function getAllUsersController({ query, set }) {
  try {
    const { page, limit, search, role, isActive, businessId } = query;

    const result = await superAdminService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      role,
      isActive,
      businessId,
    });

    return successResponse(SADM.USERS_LIST_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get all users failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.USERS_LIST_FAILED, message);
  }
}

export async function getUserByIdController({ params, set }) {
  try {
    const user = await superAdminService.getUserById(params.id);
    return successResponse(SADM.USER_GET_SUCCESS, { user });
  } catch (err) {
    logger.error({ err }, "Get user by id failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.USER_GET_FAILED, message);
  }
}

export async function forcePasswordResetController({
  params,
  body,
  store,
  set,
}) {
  try {
    await superAdminService.forcePasswordReset(params.id, body.newPassword);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_PASSWORD_FORCE_RESET",
        outletId: null,
        entityType: "User",
        entityId: params.id,
        payload: { resetBy: "SUPER_ADMIN" },
      }),
    );

    return successResponse(SADM.USER_PASSWORD_RESET_SUCCESS, null);
  } catch (err) {
    logger.error({ err }, "Force password reset failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.USER_PASSWORD_RESET_FAILED, message);
  }
}

export async function updateUserStatusController({ params, body, store, set }) {
  try {
    const user = await superAdminService.updateUserStatus(
      params.id,
      body.isActive,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: body.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        outletId: null,
        entityType: "User",
        entityId: params.id,
        payload: { isActive: body.isActive },
      }),
    );

    return successResponse(SADM.USER_STATUS_UPDATED, { user });
  } catch (err) {
    logger.error({ err }, "Update user status failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.USER_STATUS_FAILED, message);
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function getUserSessionsController({ params, set }) {
  try {
    const sessions = await superAdminService.getUserSessions(params.id);
    return successResponse(SADM.SESSIONS_LIST_SUCCESS, { sessions });
  } catch (err) {
    logger.error({ err }, "Get user sessions failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.SESSIONS_LIST_FAILED, message);
  }
}

export async function revokeAllSessionsController({ params, store, set }) {
  try {
    await superAdminService.revokeAllSessions(params.id);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_ALL_SESSIONS_REVOKED",
        outletId: null,
        entityType: "User",
        entityId: params.id,
        payload: {},
      }),
    );

    return successResponse(SADM.SESSIONS_REVOKE_ALL_SUCCESS, null);
  } catch (err) {
    logger.error({ err }, "Revoke all sessions failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.SESSIONS_REVOKE_FAILED, message);
  }
}

export async function revokeSessionController({ params, store, set }) {
  try {
    await superAdminService.revokeUserSession(params.id, params.sessionId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_SESSION_REVOKED",
        outletId: null,
        entityType: "User",
        entityId: params.id,
        payload: { sessionId: params.sessionId },
      }),
    );

    return successResponse(SADM.SESSION_REVOKE_SUCCESS, null);
  } catch (err) {
    logger.error({ err }, "Revoke session failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.SESSION_REVOKE_FAILED, message);
  }
}

// ============================================
// IMPERSONATION
// ============================================

export async function impersonateUserController({ params, store, set }) {
  try {
    const result = await superAdminService.impersonateUser(
      params.id,
      store.user.id,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_IMPERSONATION_STARTED",
        outletId: null,
        entityType: "User",
        entityId: params.id,
        payload: { targetUsername: result.user.username },
      }),
    );

    return successResponse(SADM.IMPERSONATION_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Impersonate user failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.IMPERSONATION_FAILED, message);
  }
}

// ============================================
// DASHBOARD
// ============================================

export async function getDashboardController({ set }) {
  try {
    const stats = await superAdminService.getDashboardStats();
    return successResponse(SADM.DASHBOARD_SUCCESS, stats);
  } catch (err) {
    logger.error({ err }, "Get dashboard stats failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(SADM.DASHBOARD_FAILED, message);
  }
}
