/**
 * Auth service
 * Handles user authentication logic
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
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
  storeSession,
} from "../../libs/tokenStore.js";
import {
  generateResetToken,
  storeResetToken,
  verifyResetToken,
  deleteResetToken,
} from "../../libs/otpStore.js";
import { enqueueEmailNotificationJob } from "../../libs/jobs.js";
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

  // Generate session ID from token hash
  const sessionId = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex")
    .substring(0, 16);

  // Build user data for caching (matches auth middleware format)
  const userDataForCache = {
    id: user.id,
    businessId: user.businessId,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    outletUsers: user.outletUsers.map((ou) => ({
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

  // Store tokens in Redis with TTL (include user data for caching)
  await storeAccessToken(
    user.id,
    accessToken,
    config.jwt.accessTokenTTL,
    userDataForCache,
  );
  await storeRefreshToken(user.id, refreshToken, config.jwt.refreshTokenTTL);

  // Store session for tracking (Super Admin can view/revoke sessions)
  await storeSession(
    user.id,
    sessionId,
    {
      tokenHash: sessionId,
      createdAt: new Date().toISOString(),
    },
    config.jwt.refreshTokenTTL,
  );

  const outlets = user.outletUsers.map((ou) => ({
    id: ou.outlet.id,
    name: ou.outlet.name,
    code: ou.outlet.code,
    role: ou.outletRole,
    isDefault: ou.isDefaultForUser,
  }));

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
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
    include: {
      outletUsers: {
        include: {
          outlet: true,
        },
      },
    },
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

  // Build user data for caching (matches auth middleware format)
  const userDataForCache = {
    id: user.id,
    businessId: user.businessId,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    outletUsers: user.outletUsers.map((ou) => ({
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

  // Store new tokens in Redis with TTL (include user data for caching)
  await storeAccessToken(
    user.id,
    newAccessToken,
    config.jwt.accessTokenTTL,
    userDataForCache,
  );
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

/**
 * Request password reset - generates token and sends email link
 * @param {string} email - User email
 * @param {string} frontendUrl - Frontend URL for reset link
 * @returns {Object} success message
 */
export async function requestPasswordReset(
  email,
  frontendUrl = "http://localhost:5173",
) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    const error = new Error("Email not found");
    error.statusCode = 404;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("Account is inactive");
    error.statusCode = 400;
    throw error;
  }

  const token = generateResetToken();
  await storeResetToken(token, user.id);

  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  // Send email via worker
  enqueueEmailNotificationJob({
    toEmail: email,
    templateName: "password_reset",
    templateData: {
      name: user.name,
      resetLink: resetLink,
      expiryMinutes: 60,
    },
  });

  return { message: "Password reset link has been sent to your email" };
}

/**
 * Reset password using token
 * @param {string} token - Reset token from email link
 * @param {string} newPassword - New password
 * @returns {Object} success message
 */
export async function resetPassword(token, newPassword) {
  const userId = await verifyResetToken(token);

  if (!userId) {
    const error = new Error("Invalid or expired reset link");
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error("Invalid or expired reset link");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // Delete token after successful reset
  await deleteResetToken(token);

  return {
    message: "Password has been reset successfully",
    userId: user.id,
    businessId: user.businessId,
  };
}

/**
 * Change password (authenticated user)
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} success message
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isValidPassword = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!isValidPassword) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { message: "Password has been changed successfully" };
}
