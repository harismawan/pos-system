/**
 * JWT authentication helpers and middleware
 */

import jwt from "jsonwebtoken";
import config from "../config/index.js";
import logger from "./logger.js";
import prisma from "./prisma.js";
import { validateAccessToken, storeAccessToken } from "./tokenStore.js";

/**
 * Generate access token
 * @param {Object} payload - Token payload (userId, role, etc.)
 * @returns {string} JWT token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload (userId)
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded payload
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      const error = new Error("Refresh token expired");
      error.code = "REFRESH_TOKEN_EXPIRED";
      throw error;
    }
    throw new Error("Invalid or expired refresh token");
  }
}

// Import response codes
import { AUT } from "./responseCodes.js";

/**
 * Elysia authentication beforeHandle function
 * Validates JWT and attaches user info to store
 * Uses cached user data from Redis when available, falls back to DB
 */
export async function authMiddleware({ headers, set, store }) {
  const authHeader = headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    set.status = 401;
    return {
      success: false,
      code: AUT.NOT_AUTHENTICATED,
      error: "Missing or invalid authorization header",
    };
  }

  const token = authHeader.substring(7);

  try {
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        set.status = 401;
        return {
          success: false,
          code: AUT.ACCESS_TOKEN_EXPIRED,
          error: "Access token expired",
        };
      }
      throw new Error("Invalid token");
    }

    // Validate token exists in Redis and get cached user data
    const { valid: isValidInRedis, userData: cachedUser } =
      await validateAccessToken(payload.userId, token);
    if (!isValidInRedis) {
      set.status = 401;
      return {
        success: false,
        code: AUT.ACCESS_TOKEN_EXPIRED,
        error: "Token has been revoked or expired",
      };
    }

    let user;

    // Use cached user data if available
    if (cachedUser) {
      user = cachedUser;
      logger.debug({ userId: payload.userId }, "Using cached user data");
    } else {
      // Cache miss - fetch from database
      logger.debug(
        { userId: payload.userId },
        "Cache miss, fetching user from DB",
      );
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          outletUsers: {
            include: {
              outlet: true,
            },
          },
        },
      });

      if (!dbUser || !dbUser.isActive) {
        set.status = 401;
        return {
          success: false,
          code: AUT.NOT_AUTHENTICATED,
          error: "User not found or inactive",
        };
      }

      // Build user object for caching
      user = {
        id: dbUser.id,
        businessId: dbUser.businessId,
        username: dbUser.username,
        name: dbUser.name,
        role: dbUser.role,
        isActive: dbUser.isActive,
        outletUsers: dbUser.outletUsers.map((ou) => ({
          outletId: ou.outletId,
          outletRole: ou.outletRole,
          isDefaultForUser: ou.isDefaultForUser,
          outlet: {
            id: ou.outlet.id,
            name: ou.outlet.name,
            code: ou.outlet.code,
          },
        })),
      };

      // Store in cache for future requests (update the token's value)
      await storeAccessToken(
        payload.userId,
        token,
        config.jwt.accessTokenTTL,
        user,
      );
    }

    // Verify user is still active
    if (!user.isActive) {
      set.status = 401;
      return {
        success: false,
        code: AUT.NOT_AUTHENTICATED,
        error: "User not found or inactive",
      };
    }

    // Build user context and attach to store
    store.user = {
      id: user.id,
      businessId: user.businessId,
      username: user.username,
      name: user.name,
      role: user.role,
      impersonatedBy: payload.impersonatedBy || null,
      outlets: user.outletUsers.map((ou) => ({
        id: ou.outlet.id,
        name: ou.outlet.name,
        code: ou.outlet.code,
        role: ou.outletRole,
        isDefault: ou.isDefaultForUser,
      })),
    };

    // Get active outlet from header if provided
    const outletId = headers["x-outlet-id"];

    if (outletId) {
      const hasAccess = user.outletUsers.some((ou) => ou.outletId === outletId);
      if (
        !hasAccess &&
        user.role !== "OWNER" &&
        user.role !== "ADMIN" &&
        user.role !== "SUPER_ADMIN"
      ) {
        set.status = 403;
        return {
          success: false,
          code: "AUT-403-001",
          error: "No access to specified outlet",
        };
      }
      store.outletId = outletId;
    }
  } catch (err) {
    logger.warn({ err }, "Auth middleware error");
    set.status = 401;
    return {
      success: false,
      code: AUT.NOT_AUTHENTICATED,
      error: err.message || "Authentication failed",
    };
  }
}

/**
 * Role-based access control middleware
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
export function requireRole(allowedRoles) {
  return ({ store, set }) => {
    if (!store.user) {
      set.status = 401;
      return {
        success: false,
        error: "Authentication required",
      };
    }

    if (!allowedRoles.includes(store.user.role)) {
      set.status = 403;
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }
  };
}
