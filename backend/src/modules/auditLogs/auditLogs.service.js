/**
 * Audit Logs service - Query audit logs with pagination and filters
 */

import prisma from "../../libs/prisma.js";
import {
  normalizePagination,
  buildPaginationMeta,
} from "../../libs/pagination.js";

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs(
  { page, limit, eventType, entityType, userId, outletId, startDate, endDate },
  businessId,
) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const {
    page: pageNum,
    limit: limitNum,
    skip,
  } = normalizePagination({ page, limit });

  const where = {
    OR: [{ outlet: { businessId } }, { user: { businessId } }],
  };

  if (eventType) {
    where.eventType = eventType;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (userId) {
    // Verify user belongs to business
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.businessId !== businessId) {
      // if user not in business, return empty or throw? throw is safer.
      throw new Error("User not found");
    }
    where.userId = userId;
  }

  if (outletId) {
    // Verify outlet belongs to business
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
    where.outletId = outletId;
  }

  // Date range filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Fetch user names for logs that have userId
  const userIds = [
    ...new Set(logs.filter((log) => log.userId).map((log) => log.userId)),
  ];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, username: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Enrich logs with user info
  const enrichedLogs = logs.map((log) => ({
    ...log,
    user: log.userId ? userMap.get(log.userId) || null : null,
  }));

  return {
    logs: enrichedLogs,
    pagination: buildPaginationMeta(total, pageNum, limitNum),
  };
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLogById(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      outlet: true,
      user: true,
    },
  });

  if (!log) {
    const error = new Error("Audit log not found");
    error.statusCode = 404;
    throw error;
  }

  // Check ownership: Either outlet is in business OR user is in business
  const logOutletBusinessId = log.outlet?.businessId;
  const logUserBusinessId = log.user?.businessId;

  if (logOutletBusinessId !== businessId && logUserBusinessId !== businessId) {
    const error = new Error("Audit log not found");
    error.statusCode = 404;
    throw error;
  }

  // Fetch user info if exists and needed (already included above but structure might expect clean return)
  let user = null;
  if (log.userId) {
    user = {
      id: log.user.id,
      name: log.user.name,
      username: log.user.username,
    };
  }

  // Clean up result to match original return structure (excluding full user/outlet if not originally there)
  const { outlet, user: fullUser, ...logData } = log;
  return { ...logData, user };
}

/**
 * Get distinct event types for filtering
 */
export async function getEventTypes(businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }
  const result = await prisma.auditLog.findMany({
    where: {
      OR: [{ outlet: { businessId } }, { user: { businessId } }],
    },
    select: { eventType: true },
    distinct: ["eventType"],
    orderBy: { eventType: "asc" },
  });
  return result.map((r) => r.eventType);
}

/**
 * Get distinct entity types for filtering
 */
export async function getEntityTypes(businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }
  const result = await prisma.auditLog.findMany({
    where: {
      OR: [{ outlet: { businessId } }, { user: { businessId } }],
    },
    select: { entityType: true },
    distinct: ["entityType"],
    orderBy: { entityType: "asc" },
  });
  return result.map((r) => r.entityType);
}
