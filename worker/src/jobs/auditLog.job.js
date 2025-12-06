/**
 * Audit log job handler
 */

import prisma from '../libs/prisma.js';
import logger from '../libs/logger.js';

export async function handleAuditLogJob(payload) {
    const { eventType, userId, outletId, entityType, entityId, payload: data } = payload;

    try {
        await prisma.auditLog.create({
            data: {
                eventType,
                userId,
                outletId,
                entityType,
                entityId,
                payload: data,
            },
        });

        logger.info({ eventType, entityType, entityId }, 'Audit log created');
    } catch (err) {
        logger.error({ err, payload }, 'Failed to create audit log');
        throw err;
    }
}
