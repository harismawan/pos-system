/**
 * Audit Logs service - Query audit logs with pagination and filters
 */

import prisma from '../../libs/prisma.js';
import { normalizePagination, buildPaginationMeta } from '../../libs/pagination.js';

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs({ page, limit, eventType, entityType, userId, outletId, startDate, endDate }) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination({ page, limit });

    const where = {};

    if (eventType) {
        where.eventType = eventType;
    }

    if (entityType) {
        where.entityType = entityType;
    }

    if (userId) {
        where.userId = userId;
    }

    if (outletId) {
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
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        }),
        prisma.auditLog.count({ where }),
    ]);

    // Fetch user names for logs that have userId
    const userIds = [...new Set(logs.filter(log => log.userId).map(log => log.userId))];
    const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, username: true },
        })
        : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // Enrich logs with user info
    const enrichedLogs = logs.map(log => ({
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
export async function getAuditLogById(id) {
    const log = await prisma.auditLog.findUnique({
        where: { id },
    });

    if (!log) {
        const error = new Error('Audit log not found');
        error.statusCode = 404;
        throw error;
    }

    // Fetch user info if exists
    let user = null;
    if (log.userId) {
        user = await prisma.user.findUnique({
            where: { id: log.userId },
            select: { id: true, name: true, username: true },
        });
    }

    return { ...log, user };
}

/**
 * Get distinct event types for filtering
 */
export async function getEventTypes() {
    const result = await prisma.auditLog.findMany({
        select: { eventType: true },
        distinct: ['eventType'],
        orderBy: { eventType: 'asc' },
    });
    return result.map(r => r.eventType);
}

/**
 * Get distinct entity types for filtering
 */
export async function getEntityTypes() {
    const result = await prisma.auditLog.findMany({
        select: { entityType: true },
        distinct: ['entityType'],
        orderBy: { entityType: 'asc' },
    });
    return result.map(r => r.entityType);
}
