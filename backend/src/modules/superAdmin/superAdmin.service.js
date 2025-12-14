/**
 * Super Admin service - Platform-level administration
 * Only accessible by SUPER_ADMIN role users
 */

import prisma from "../../libs/prisma.js";
import bcrypt from "bcryptjs";
import logger from "../../libs/logger.js";
import {
  normalizePagination,
  buildPaginationMeta,
} from "../../libs/pagination.js";
import {
  revokeAllUserTokens,
  getActiveSessions,
  revokeSession,
} from "../../libs/tokenStore.js";
import { generateAccessToken, generateRefreshToken } from "../../libs/auth.js";
import { storeAccessToken, storeRefreshToken } from "../../libs/tokenStore.js";

const SALT_ROUNDS = 12;

// ============================================
// BUSINESS MANAGEMENT
// ============================================

/**
 * Get all businesses with pagination
 */
export async function getBusinesses({ page, limit, search, status }) {
  const {
    page: pageNum,
    limit: limitNum,
    skip,
  } = normalizePagination({ page, limit });

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            outlets: true,
            products: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.business.count({ where }),
  ]);

  return {
    businesses,
    pagination: buildPaginationMeta(total, pageNum, limitNum),
  };
}

/**
 * Get business by ID with details
 */
export async function getBusinessById(id) {
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
          outlets: true,
          products: true,
          customers: true,
          suppliers: true,
        },
      },
      outlets: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },
    },
  });

  if (!business) {
    const error = new Error("Business not found");
    error.statusCode = 404;
    throw error;
  }

  return business;
}

/**
 * Update business status (suspend/activate)
 */
export async function updateBusinessStatus(id, status, superAdminId) {
  const business = await prisma.business.findUnique({ where: { id } });

  if (!business) {
    const error = new Error("Business not found");
    error.statusCode = 404;
    throw error;
  }

  const updateData = { status };

  if (status === "SUSPENDED") {
    updateData.suspendedAt = new Date();
    updateData.suspendedBy = superAdminId;
  } else if (status === "ACTIVE") {
    updateData.suspendedAt = null;
    updateData.suspendedBy = null;
  }

  const updated = await prisma.business.update({
    where: { id },
    data: updateData,
  });

  return { updated, previousStatus: business.status };
}

// ============================================
// USER MANAGEMENT (CROSS-BUSINESS)
// ============================================

/**
 * Get all users across all businesses
 */
export async function getAllUsers({
  page,
  limit,
  search,
  role,
  isActive,
  businessId,
}) {
  const {
    page: pageNum,
    limit: limitNum,
    skip,
  } = normalizePagination({ page, limit });

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === "true" || isActive === true;
  }

  if (businessId) {
    where.businessId = businessId;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        business: {
          select: { id: true, name: true, code: true },
        },
        outletUsers: {
          select: {
            outlet: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: buildPaginationMeta(total, pageNum, limitNum),
  };
}

/**
 * Get user by ID (cross-business)
 */
export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      business: {
        select: { id: true, name: true, code: true, status: true },
      },
      outletUsers: {
        include: {
          outlet: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

/**
 * Force password reset for a user
 */
export async function forcePasswordReset(userId, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Revoke all existing sessions
  await revokeAllUserTokens(userId);

  return { success: true };
}

/**
 * Update user status (activate/deactivate)
 */
export async function updateUserStatus(userId, isActive) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Prevent deactivating super admins
  if (user.role === "SUPER_ADMIN" && !isActive) {
    const error = new Error("Cannot deactivate a Super Admin");
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      username: true,
      isActive: true,
    },
  });

  // If deactivating, revoke all sessions
  if (!isActive) {
    await revokeAllUserTokens(userId);
  }

  return updated;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const sessions = await getActiveSessions(userId);
  return sessions;
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllSessions(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await revokeAllUserTokens(userId);

  return { success: true };
}

/**
 * Revoke a specific session
 */
export async function revokeUserSession(userId, sessionId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await revokeSession(userId, sessionId);

  return { success: true };
}

// ============================================
// IMPERSONATION
// ============================================

/**
 * Generate impersonation token for a user
 * Returns temporary tokens for Super Admin to act as the user
 */
export async function impersonateUser(targetUserId, superAdminId) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      business: true,
      outletUsers: {
        include: {
          outlet: true,
        },
      },
    },
  });

  if (!targetUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Cannot impersonate another Super Admin
  if (targetUser.role === "SUPER_ADMIN") {
    const error = new Error("Cannot impersonate another Super Admin");
    error.statusCode = 403;
    throw error;
  }

  // Cannot impersonate inactive user
  if (!targetUser.isActive) {
    const error = new Error("Cannot impersonate inactive user");
    error.statusCode = 400;
    throw error;
  }

  // Generate short-lived tokens (1 hour)
  const accessToken = generateAccessToken({
    userId: targetUser.id,
    role: targetUser.role,
    impersonatedBy: superAdminId,
  });

  const refreshToken = generateRefreshToken({
    userId: targetUser.id,
    impersonatedBy: superAdminId,
  });

  // Build user data for caching (matches auth middleware format)
  const userDataForCache = {
    id: targetUser.id,
    businessId: targetUser.businessId,
    username: targetUser.username,
    name: targetUser.name,
    role: targetUser.role,
    isActive: targetUser.isActive,
    outletUsers: targetUser.outletUsers.map((ou) => ({
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

  // Store tokens with shorter TTL (1 hour), include user data for caching
  const impersonationTTL = 3600; // 1 hour
  await storeAccessToken(
    targetUser.id,
    accessToken,
    impersonationTTL,
    userDataForCache,
  );
  await storeRefreshToken(targetUser.id, refreshToken, impersonationTTL);

  const outlets = targetUser.outletUsers.map((ou) => ({
    id: ou.outlet.id,
    name: ou.outlet.name,
    code: ou.outlet.code,
    role: ou.outletRole,
    isDefault: ou.isDefaultForUser,
  }));

  return {
    accessToken,
    refreshToken,
    outlets,
    user: {
      id: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
      role: targetUser.role,
      businessId: targetUser.businessId,
      businessName: targetUser.business?.name,
    },
    expiresIn: impersonationTTL,
  };
}

// ============================================
// DASHBOARD / ANALYTICS
// ============================================

/**
 * Get platform-wide analytics
 */
export async function getDashboardStats() {
  const [
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    totalUsers,
    activeUsers,
    totalOutlets,
    totalProducts,
    recentBusinesses,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { status: "ACTIVE" } }),
    prisma.business.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.outlet.count(),
    prisma.product.count(),
    prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
        _count: {
          select: { users: true, outlets: true },
        },
      },
    }),
  ]);

  return {
    businesses: {
      total: totalBusinesses,
      active: activeBusinesses,
      suspended: suspendedBusinesses,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
    },
    outlets: {
      total: totalOutlets,
    },
    products: {
      total: totalProducts,
    },
    recentBusinesses,
  };
}
