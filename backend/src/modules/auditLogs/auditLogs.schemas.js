/**
 * Audit Logs schemas - Elysia validation
 */

import { t } from 'elysia';

export const getAuditLogsQuerySchema = {
    query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        eventType: t.Optional(t.String()),
        entityType: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        outletId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
    }),
};

export const auditLogIdParamSchema = {
    params: t.Object({
        id: t.String(),
    }),
};
