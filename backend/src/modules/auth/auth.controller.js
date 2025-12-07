/**
 * Auth controller
 * Handles HTTP requests for authentication
 */

import * as authService from "./auth.service.js";
import {
  revokeAccessToken,
  revokeRefreshToken,
} from "../../libs/tokenStore.js";
import logger from "../../libs/logger.js";
import { AUT } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";

export async function loginController({ body, set }) {
  try {
    const { username, password } = body;

    const result = await authService.login(username, password);

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
    }

    logger.info(
      { userId: store.user?.id },
      "User logged out and tokens revoked",
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
