import '../../testSetup.js';
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createMockFn } from '../../mocks/mockFn.js';

const serviceMock = {
    getAuditLogs: createMockFn(async () => ({ logs: [], pagination: {} })),
    getAuditLogById: createMockFn(async () => ({ id: 'log-1' })),
    getEventTypes: createMockFn(async () => ['USER_LOGIN']),
    getEntityTypes: createMockFn(async () => ['User']),
};

const loggerMock = { error: createMockFn() };

mock.module('../../../src/modules/auditLogs/auditLogs.service.js', () => serviceMock);
mock.module('../../../src/libs/logger.js', () => ({ default: loggerMock }));

const controller = await import('../../../src/modules/auditLogs/auditLogs.controller.js');

describe('modules/auditLogs/auditLogs.controller', () => {
    beforeEach(() => {
        serviceMock.getAuditLogs.mockReset();
        serviceMock.getAuditLogs.mockResolvedValue({ logs: [], pagination: {} });
        serviceMock.getAuditLogById.mockReset();
        serviceMock.getAuditLogById.mockResolvedValue({ id: 'log-1' });
        serviceMock.getEventTypes.mockReset();
        serviceMock.getEventTypes.mockResolvedValue(['USER_LOGIN']);
        serviceMock.getEntityTypes.mockReset();
        serviceMock.getEntityTypes.mockResolvedValue(['User']);
        loggerMock.error.mockReset();
    });

    it('passes outletId from store when fetching logs', async () => {
        const set = {};
        const store = { outletId: 'out-1' };
        const res = await controller.getAuditLogsController({
            query: { page: 1, limit: 10 },
            store,
            set,
        });

        expect(res.success).toBe(true);
        const args = serviceMock.getAuditLogs.calls[0][0];
        expect(args.outletId).toBe('out-1');
    });

    it('prioritizes query outletId over store outletId', async () => {
        const set = {};
        const store = { outletId: 'store-out' };
        const res = await controller.getAuditLogsController({
            query: { page: 1, limit: 10, outletId: 'query-out' },
            store,
            set,
        });

        expect(res.success).toBe(true);
        const args = serviceMock.getAuditLogs.calls[0][0];
        expect(args.outletId).toBe('query-out');
    });

    it('returns error when get audit logs fails', async () => {
        const set = {};
        serviceMock.getAuditLogs.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.getAuditLogsController({ query: {}, store: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
    });

    it('returns 404 when audit log not found', async () => {
        const set = {};
        serviceMock.getAuditLogById.mockImplementation(async () => null);

        const res = await controller.getAuditLogByIdController({ params: { id: 'missing' }, set });

        expect(set.status).toBe(404);
        expect(res.success).toBe(false);
    });

    it('uses provided status when get by id fails', async () => {
        const set = {};
        const err = new Error('boom');
        err.statusCode = 418;
        serviceMock.getAuditLogById.mockImplementation(async () => { throw err; });

        const res = await controller.getAuditLogByIdController({ params: { id: 'log-1' }, set });
        expect(set.status).toBe(418);
        expect(res.error).toBe('boom');
    });

    it('returns event types on success', async () => {
        const set = {};
        const res = await controller.getEventTypesController({ set });
        expect(res.success).toBe(true);
        expect(serviceMock.getEventTypes.calls.length).toBeGreaterThan(0);
    });

    it('returns error when get event types fails', async () => {
        const set = {};
        serviceMock.getEventTypes.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.getEventTypesController({ set });
        expect(set.status).toBe(500);
        expect(res.success).toBe(false);
    });

    it('returns entity types', async () => {
        const set = {};
        const res = await controller.getEntityTypesController({ set });

        expect(res.success).toBe(true);
        expect(serviceMock.getEntityTypes.calls.length).toBe(1);
    });

    it('handles errors from service with 500', async () => {
        const set = {};
        serviceMock.getEntityTypes.mockImplementation(async () => { throw new Error('boom'); });

        const res = await controller.getEntityTypesController({ set });

        expect(set.status).toBe(500);
        expect(res.success).toBe(false);
    });
});
