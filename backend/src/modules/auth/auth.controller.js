/**
 * Auth controller
 * Handles HTTP requests for authentication
 */

import crypto from "crypto";
import * as authService from "./auth.service.js";
import {
  revokeAccessToken,
  revokeRefreshToken,
  revokeSession,
} from "../../libs/tokenStore.js";
import logger from "../../libs/logger.js";
import { AUT } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";

export async function loginController({ body, set }) {
  try {
    const { username, password } = body;

    const result = await authService.login(username, password);

    // Audit Log - Manual since no store.user context yet
    enqueueAuditLogJob({
      eventType: "USER_LOGIN",
      businessId: result.user.businessId,
      userId: result.user.id,
      outletId: null,
      entityType: "User",
      entityId: result.user.id,
      payload: {
        username: result.user.username,
        timestamp: new Date().toISOString(),
      },
    });

    return successResponse(AUT.LOGIN_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Login failed");

    if (
      err.message === "Invalid credentials" ||
      err.message === "Account is inactive"
    ) {
      set.status = 401;
      return errorResponse(AUT.INVALID_CREDENTIALS, err.message);
    }

    set.status = 500;
    return errorResponse(AUT.LOGIN_FAILED, "Internal Server Error");
  }
}

export async function refreshController({ body, set }) {
  try {
    const { refreshToken } = body;

    if (!refreshToken) {
      set.status = 400;
      return errorResponse(
        AUT.REFRESH_TOKEN_REQUIRED,
        "Refresh token required",
      );
    }

    const result = await authService.refresh(refreshToken);

    return successResponse(AUT.REFRESH_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Token refresh failed");

    // Handle known errors
    if (
      err.message === "Invalid refresh token" ||
      err.message === "Refresh token has been revoked or expired" ||
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError"
    ) {
      set.status = 401;
      if (err.name === "TokenExpiredError" || err.message.includes("expired")) {
        return errorResponse(
          AUT.REFRESH_TOKEN_EXPIRED,
          "Refresh token expired",
        );
      }
      return errorResponse(AUT.INVALID_REFRESH_TOKEN, "Invalid refresh token");
    }

    set.status = 500;
    return errorResponse(AUT.INVALID_REFRESH_TOKEN, "Internal Server Error");
  }
}

export async function getMeController({ store, set }) {
  try {
    // Assuming store.user is populated by a preceding middleware
    if (!store.user) {
      set.status = 401;
      return errorResponse(
        AUT.NOT_AUTHENTICATED,
        "User not authenticated or user data not found",
      );
    }
    return successResponse(AUT.GET_ME_SUCCESS, { user: store.user });
  } catch (err) {
    logger.error({ err }, "Get user info failed");
    set.status = 500;
    return errorResponse(AUT.GET_ME_FAILED, "Internal Server Error");
  }
}

export async function logoutController({ headers, body, store }) {
  try {
    // Extract access token from authorization header
    const authHeader = headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const accessToken = authHeader.substring(7);
      await revokeAccessToken(store.user.id, accessToken);
    }

    // Revoke refresh token if provided in body
    if (body?.refreshToken) {
      await revokeRefreshToken(store.user.id, body.refreshToken);

      // Also delete the session from Redis
      const sessionId = crypto
        .createHash("sha256")
        .update(body.refreshToken)
        .digest("hex")
        .substring(0, 16);
      await revokeSession(store.user.id, sessionId);
    }

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "USER_LOGGED_OUT",
        entityType: "User",
        entityId: store.user.id,
        payload: {
          timestamp: new Date().toISOString(),
          refreshTokenProvided: !!body?.refreshToken,
        },
      }),
    );

    return successResponse(AUT.LOGOUT_SUCCESS, {
      message: "Logged out successfully",
    });
  } catch (err) {
    logger.error({ err, userId: store.user?.id }, "Logout failed");
    // Still return success as logout is best-effort
    return successResponse(AUT.LOGOUT_SUCCESS, {
      message: "Logged out successfully",
    });
  }
}

export async function forgotPasswordController({ body, set }) {
  try {
    const { email } = body;
    const result = await authService.requestPasswordReset(email);
    return successResponse(AUT.FORGOT_PASSWORD_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Forgot password failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(AUT.FORGOT_PASSWORD_FAILED, message);
  }
}

export async function resetPasswordController({ body, set }) {
  try {
    const { token, newPassword } = body;
    const result = await authService.resetPassword(token, newPassword);

    // Audit Log - Manual
    enqueueAuditLogJob({
      eventType: "PASSWORD_RESET",
      businessId: result.businessId,
      userId: result.userId,
      outletId: null,
      entityType: "User",
      entityId: result.userId,
      payload: {
        method: "email_link",
        timestamp: new Date().toISOString(),
      },
    });

    return successResponse(AUT.RESET_PASSWORD_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Reset password failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(AUT.RESET_PASSWORD_FAILED, message);
  }
}

export async function changePasswordController({ body, store, set }) {
  try {
    const { currentPassword, newPassword } = body;
    const result = await authService.changePassword(
      store.user.id,
      currentPassword,
      newPassword,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: store.user.id,
        payload: {
          timestamp: new Date().toISOString(),
        },
      }),
    );

    return successResponse(AUT.CHANGE_PASSWORD_SUCCESS, result);
  } catch (err) {
    logger.error({ err, userId: store.user?.id }, "Change password failed");
    set.status = err.statusCode || 500;
    const message = err.statusCode ? err.message : "Internal Server Error";
    return errorResponse(AUT.CHANGE_PASSWORD_FAILED, message);
  }
}
