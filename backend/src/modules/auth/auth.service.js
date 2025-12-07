/**
 * Auth service
 * Handles user authentication logic
 */

import bcrypt from "bcryptjs";
import prisma from "../../libs/prisma.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../libs/auth.js";
import {
  storeAccessToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} from "../../libs/tokenStore.js";
import { enqueueAuditLogJob } from "../../libs/jobs.js";
import logger from "../../libs/logger.js";
import config from "../../config/index.js";

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Object} tokens and user data
 */
export async function login(username, password) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      outletUsers: {
        include: {
          outlet: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    throw new Error("Account is inactive");
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
  });

  // Store tokens in Redis with TTL
  await storeAccessToken(user.id, accessToken, config.jwt.accessTokenTTL);
  await storeRefreshToken(user.id, refreshToken, config.jwt.refreshTokenTTL);

  const outlets = user.outletUsers.map((ou) => ({
    id: ou.outlet.id,
    name: ou.outlet.name,
    code: ou.outlet.code,
    role: ou.outletRole,
    isDefault: ou.isDefaultForUser,
  }));

  // Enqueue audit log
  enqueueAuditLogJob({
    eventType: "USER_LOGIN",
    userId: user.id,
    outletId: null,
    entityType: "User",
    entityId: user.id,
    payload: {
      username: user.username,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    outlets,
  };
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} new tokens
 */
export async function refresh(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid refresh token");
  }

  // Validate refresh token exists in Redis
  const isValid = await validateRefreshToken(user.id, refreshToken);
  if (!isValid) {
    throw new Error("Refresh token has been revoked or expired");
  }

  // Revoke old refresh token (one-time use)
  await revokeRefreshToken(user.id, refreshToken);

  const newAccessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken({
    userId: user.id,
  });

  // Store new tokens in Redis with TTL
  await storeAccessToken(user.id, newAccessToken, config.jwt.accessTokenTTL);
  await storeRefreshToken(user.id, newRefreshToken, config.jwt.refreshTokenTTL);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Get current user info
 * @param {string} userId - User ID
 * @returns {Object} user data with outlets
 */
export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      outletUsers: {
        include: {
          outlet: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const outlets = user.outletUsers.map((ou) => ({
    id: ou.outlet.id,
    name: ou.outlet.name,
    code: ou.outlet.code,
    role: ou.outletRole,
    isDefault: ou.isDefaultForUser,
  }));

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    outlets,
  };
}
