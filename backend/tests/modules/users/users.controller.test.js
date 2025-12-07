import '../../testSetup.js';
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createMockFn } from '../../mocks/mockFn.js';

const serviceMock = {
    getUserById: createMockFn(async () => null),
    getUsers: createMockFn(async () => ({ users: [], pagination: {} })),
    createUser: createMockFn(async () => ({ id: 'u1', name: 'Test', username: 'test', role: 'ADMIN' })),
    updateUser: createMockFn(async () => ({ id: 'u1', name: 'Updated' })),
    deleteUser: createMockFn(async () => ({ message: 'deleted' })),
    assignUserToOutlet: createMockFn(async () => ({ id: 'ou1' })),
    removeUserFromOutlet: createMockFn(async () => ({ message: 'removed' })),
};
const jobsMock = { enqueueAuditLogJob: createMockFn() };
const loggerMock = { error: createMockFn() };

mock.module('../../../src/modules/users/users.service.js', () => serviceMock);
mock.module('../../../src/libs/jobs.js', () => jobsMock);
mock.module('../../../src/libs/logger.js', () => ({ default: loggerMock }));

const controller = await import('../../../src/modules/users/users.controller.js');

describe('modules/users/users.controller', () => {
    beforeEach(() => {
        serviceMock.getUsers.mockReset();
        serviceMock.getUsers.mockResolvedValue({ users: [], pagination: {} });
        serviceMock.getUserById.mockReset();
        serviceMock.getUserById.mockResolvedValue(null);
        serviceMock.createUser.mockReset();
        serviceMock.createUser.mockResolvedValue({ id: 'u1', name: 'Test', username: 'test', role: 'ADMIN' });
        serviceMock.updateUser.mockReset();
        serviceMock.updateUser.mockResolvedValue({ id: 'u1', name: 'Updated' });
        serviceMock.deleteUser.mockReset();
        serviceMock.deleteUser.mockResolvedValue({ message: 'deleted' });
        serviceMock.assignUserToOutlet.mockReset();
        serviceMock.assignUserToOutlet.mockResolvedValue({ id: 'ou1' });
        serviceMock.removeUserFromOutlet.mockReset();
        serviceMock.removeUserFromOutlet.mockResolvedValue({ message: 'removed' });
        jobsMock.enqueueAuditLogJob.mockReset();
        loggerMock.error.mockReset();
    });

    it('lists users with parsed pagination', async () => {
        const set = {};
        const res = await controller.getUsersController({
            query: { page: '2', limit: '5', search: 'a', role: 'ADMIN', isActive: 'true' },
            store: {},
            set,
        });

        expect(res.success).toBe(true);
        const args = serviceMock.getUsers.calls[0][0];
        expect(args.page).toBe(2);
        expect(args.limit).toBe(5);
        expect(args.role).toBe('ADMIN');
    });

    it('returns error when list users fails', async () => {
        const set = {};
        serviceMock.getUsers.mockImplementation(async () => { throw new Error('boom'); });

        const res = await controller.getUsersController({ query: {}, store: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
    });

    it('returns user by id', async () => {
        const set = {};
        serviceMock.getUserById.mockResolvedValue({ id: 'u1' });

        const res = await controller.getUserByIdController({ params: { id: 'u1' }, store: {}, set });

        expect(res.success).toBe(true);
        expect(res.data.user.id).toBe('u1');
    });

    it('returns 404 when user is missing', async () => {
        const set = {};
        const res = await controller.getUserByIdController({ params: { id: 'missing' }, store: {}, set });
        expect(set.status).toBe(404);
        expect(res.success).toBe(false);
    });

    it('uses provided status when get by id fails', async () => {
        const set = {};
        const err = new Error('gone');
        err.statusCode = 410;
        serviceMock.getUserById.mockImplementation(async () => { throw err; });

        const res = await controller.getUserByIdController({ params: { id: 'u1' }, store: {}, set });
        expect(set.status).toBe(410);
        expect(res.error).toBe('gone');
    });

    it('creates user and enqueues audit log', async () => {
        const set = {};
        const store = { user: { id: 'admin' }, outletId: 'out-1' };
        const res = await controller.createUserController({ body: { name: 'Test' }, store, set });
        expect(set.status).toBe(201);
        expect(res.success).toBe(true);
        expect(jobsMock.enqueueAuditLogJob.calls.length).toBeGreaterThan(0);
    });

    it('returns error when create fails', async () => {
        const set = {};
        const err = new Error('conflict');
        err.statusCode = 409;
        serviceMock.createUser.mockImplementation(async () => { throw err; });

        const res = await controller.createUserController({ body: {}, store: {}, set });
        expect(set.status).toBe(409);
        expect(res.error).toBe('conflict');
    });

    it('updates user and enqueues audit log', async () => {
        const set = {};
        const store = { user: { id: 'admin' }, outletId: 'out-1' };

        const res = await controller.updateUserController({ params: { id: 'u1' }, body: { name: 'New' }, store, set });

        expect(res.success).toBe(true);
        expect(jobsMock.enqueueAuditLogJob.calls[0][0].eventType).toBe('USER_UPDATED');
    });

    it('returns error when update fails', async () => {
        const set = {};
        serviceMock.updateUser.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.updateUserController({ params: { id: 'u1' }, body: {}, store: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
    });

    it('deletes user and enqueues audit log', async () => {
        const set = {};
        const store = { user: { id: 'admin' }, outletId: 'out-1' };

        const res = await controller.deleteUserController({ params: { id: 'u1' }, store, set });

        expect(res.success).toBe(true);
        expect(jobsMock.enqueueAuditLogJob.calls.at(-1)[0].eventType).toBe('USER_DELETED');
    });

    it('returns error when delete fails', async () => {
        const set = {};
        serviceMock.deleteUser.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.deleteUserController({ params: { id: 'u1' }, store: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
    });

    it('assigns outlet and enqueues audit log', async () => {
        const set = {};
        const store = { user: { id: 'admin' } };

        const res = await controller.assignOutletController({
            params: { id: 'u1' },
            body: { outletId: 'out-1', outletRole: 'MANAGER', isDefault: true },
            store,
            set,
        });

        expect(res.success).toBe(true);
        expect(jobsMock.enqueueAuditLogJob.calls.at(-1)[0].eventType).toBe('USER_OUTLET_ASSIGNED');
    });

    it('returns error when assign outlet fails', async () => {
        const set = {};
        const err = new Error('fail');
        err.statusCode = 422;
        serviceMock.assignUserToOutlet.mockImplementation(async () => { throw err; });

        const res = await controller.assignOutletController({
            params: { id: 'u1' },
            body: { outletId: 'out-1', outletRole: 'MANAGER', isDefault: false },
            store: {},
            set,
        });

        expect(set.status).toBe(422);
        expect(res.error).toBe('fail');
    });

    it('removes outlet and enqueues audit log', async () => {
        const set = {};
        const store = { user: { id: 'admin' } };

        const res = await controller.removeOutletController({ params: { id: 'u1', outletId: 'out-1' }, store, set });

        expect(res.success).toBe(true);
        expect(jobsMock.enqueueAuditLogJob.calls.at(-1)[0].eventType).toBe('USER_OUTLET_REMOVED');
    });

    it('returns error when remove outlet fails', async () => {
        const set = {};
        serviceMock.removeUserFromOutlet.mockImplementation(async () => { throw new Error('fail'); });

        const res = await controller.removeOutletController({ params: { id: 'u1', outletId: 'out-1' }, store: {}, set });
        expect(set.status).toBe(500);
        expect(res.error).toBe('Internal Server Error');
    });
});
