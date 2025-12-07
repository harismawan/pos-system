import '../../testSetup.js';
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createPrismaMock } from '../../mocks/prisma.js';
import { createLoggerMock } from '../../mocks/logger.js';
import { createMockFn } from '../../mocks/mockFn.js';

const prismaMock = createPrismaMock();
const loggerMock = createLoggerMock();
const bcryptMock = { compare: createMockFn(async () => true) };

const tokenHelpersMock = {
    generateAccessToken: createMockFn(() => 'access-token'),
    generateRefreshToken: createMockFn(() => 'refresh-token'),
    verifyRefreshToken: createMockFn(() => ({ userId: 'user-1' })),
};

const tokenStoreMock = {
    storeAccessToken: createMockFn(async () => undefined),
    storeRefreshToken: createMockFn(async () => undefined),
    validateRefreshToken: createMockFn(async () => true),
    revokeRefreshToken: createMockFn(async () => undefined),
};

const jobsMock = { enqueueAuditLogJob: createMockFn() };

mock.module('../../../src/libs/prisma.js', () => ({ default: prismaMock }));
mock.module('../../../src/libs/logger.js', () => ({ default: loggerMock }));
mock.module('bcryptjs', () => ({ default: bcryptMock }));
mock.module('../../../src/libs/auth.js', () => tokenHelpersMock);
mock.module('../../../src/libs/tokenStore.js', () => tokenStoreMock);
mock.module('../../../src/libs/jobs.js', () => jobsMock);

const authService = await import('../../../src/modules/auth/auth.service.js?controller');

const resetCommonMocks = () => {
    prismaMock.user.findUnique.mockReset?.();
    tokenStoreMock.storeAccessToken.mockReset?.();
    tokenStoreMock.storeRefreshToken.mockReset?.();
    tokenStoreMock.validateRefreshToken.mockReset?.();
    tokenStoreMock.revokeRefreshToken.mockReset?.();
    bcryptMock.compare.mockReset?.();
    tokenHelpersMock.generateAccessToken.mockReset?.();
    tokenHelpersMock.generateRefreshToken.mockReset?.();
    tokenHelpersMock.verifyRefreshToken.mockReset?.();
    jobsMock.enqueueAuditLogJob.mockReset?.();
};

describe('modules/auth/auth.service login', () => {
    beforeEach(() => {
        resetCommonMocks();
        tokenHelpersMock.generateAccessToken.mockReturnValue('access-token');
        tokenHelpersMock.generateRefreshToken.mockReturnValue('refresh-token');
        bcryptMock.compare.mockImplementation(async () => true);
    });

    it('throws when user is not found', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => null);

        const err = await authService.login('missing', 'secret').catch(e => e);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Invalid credentials');
    });

    it('throws when account is inactive', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({
            id: 'user-1',
            isActive: false,
            passwordHash: 'hash',
            outletUsers: [],
        }));

        await expect(authService.login('user', 'secret')).rejects.toThrow('Account is inactive');
    });

    it('throws when password is invalid', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({
            id: 'user-1',
            isActive: true,
            passwordHash: 'hash',
            outletUsers: [],
        }));
        bcryptMock.compare.mockImplementation(async () => false);

        await expect(authService.login('user', 'bad')).rejects.toThrow('Invalid credentials');
    });

    it('returns tokens and stores them when credentials are valid', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({
            id: 'user-1',
            username: 'user',
            name: 'Test User',
            email: 'user@example.com',
            role: 'OWNER',
            passwordHash: 'hash',
            isActive: true,
            outletUsers: [],
        }));
        bcryptMock.compare.mockImplementation(async () => true);

        const result = await authService.login('user', 'secret');

        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(tokenStoreMock.storeAccessToken.calls.length).toBeGreaterThan(0);
        expect(tokenStoreMock.storeRefreshToken.calls.length).toBeGreaterThan(0);
        expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
    });

    it('maps outlets and enqueues audit log with payload', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({
            id: 'user-1',
            username: 'user',
            name: 'Test User',
            email: 'user@example.com',
            role: 'OWNER',
            passwordHash: 'hash',
            isActive: true,
            outletUsers: [{
                outlet: { id: 'o1', name: 'Outlet', code: 'OUT' },
                outletRole: 'MANAGER',
                isDefaultForUser: true,
            }],
        }));

        const res = await authService.login('user', 'secret');

        expect(res.outlets[0]).toEqual({
            id: 'o1',
            name: 'Outlet',
            code: 'OUT',
            role: 'MANAGER',
            isDefault: true,
        });
        const auditPayload = jobsMock.enqueueAuditLogJob.calls[0][0];
        expect(auditPayload.eventType).toBe('USER_LOGIN');
        expect(auditPayload.entityId).toBe('user-1');
    });

    it('stores tokens with TTL values from config', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({
            id: 'user-1',
            username: 'user',
            name: 'Test User',
            email: 'user@example.com',
            role: 'OWNER',
            passwordHash: 'hash',
            isActive: true,
            outletUsers: [],
        }));

        await authService.login('user', 'secret');

        const accessArgs = tokenStoreMock.storeAccessToken.calls[0];
        const refreshArgs = tokenStoreMock.storeRefreshToken.calls[0];
        expect(accessArgs[0]).toBe('user-1');
        expect(accessArgs[2]).toBe(900); // 15m in seconds per test setup
        expect(refreshArgs[2]).toBe(86400); // 1d in seconds per test setup
    });
});

describe('modules/auth/auth.service refresh/getMe', () => {
    beforeEach(() => {
        resetCommonMocks();
        tokenHelpersMock.verifyRefreshToken.mockImplementation(() => ({ userId: 'user-1' }));
        tokenHelpersMock.generateAccessToken.mockReturnValue('new-access');
        tokenHelpersMock.generateRefreshToken.mockReturnValue('new-refresh');
        tokenStoreMock.validateRefreshToken.mockResolvedValue(true);
    });

    it('throws when refresh token is invalid in store', async () => {
        tokenHelpersMock.verifyRefreshToken.mockImplementation(() => ({ userId: 'user-1' }));
        tokenStoreMock.validateRefreshToken.mockImplementation(async () => false);
        prismaMock.user.findUnique.mockImplementation(async () => ({ id: 'user-1', isActive: true }));

        const err = await authService.refresh('rt').catch(e => e);
        expect(err).toBeInstanceOf(Error);
    });

    it('throws when refresh token user not found', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => null);
        await expect(authService.refresh('rt')).rejects.toThrow('Invalid refresh token');
    });

    it('throws when refresh user is inactive', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({ id: 'user-1', isActive: false }));

        await expect(authService.refresh('rt')).rejects.toThrow('Invalid refresh token');
    });

    it('returns new tokens and stores them on refresh', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({ id: 'user-1', isActive: true, role: 'ADMIN' }));
        tokenStoreMock.validateRefreshToken.mockResolvedValue(true);
        tokenStoreMock.revokeRefreshToken.mockResolvedValue();

        const res = await authService.refresh('rt');

        expect(res.accessToken).toBeDefined();
        expect(tokenStoreMock.storeAccessToken.calls.length).toBe(1);
        expect(tokenStoreMock.revokeRefreshToken.calls.length).toBe(1);
        expect(tokenStoreMock.storeAccessToken.calls[0][2]).toBe(900);
        expect(tokenStoreMock.storeRefreshToken.calls[0][2]).toBe(86400);
        expect(tokenStoreMock.revokeRefreshToken.calls[0]).toEqual(['user-1', 'rt']);
    });

    it('throws when refresh token verification fails', async () => {
        tokenHelpersMock.verifyRefreshToken.mockImplementation(() => { throw new Error('invalid'); });

        await expect(authService.refresh('bad')).rejects.toThrow('invalid');
    });

    it('returns user data in getMe', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => ({
            id: 'u1',
            username: 'user',
            name: 'Name',
            email: 'a@b.com',
            role: 'ADMIN',
            outletUsers: [{
                outlet: { id: 'o1', name: 'Outlet', code: 'O1' },
                outletRole: 'CLERK',
                isDefaultForUser: false,
            }],
        }));

        const result = await authService.getMe('u1');
        expect(result.id).toBe('u1');
        expect(result.role).toBe('ADMIN');
        expect(result.outlets[0]).toEqual({
            id: 'o1',
            name: 'Outlet',
            code: 'O1',
            role: 'CLERK',
            isDefault: false,
        });
    });

    it('throws when user not found in getMe', async () => {
        prismaMock.user.findUnique.mockImplementation(async () => null);

        await expect(authService.getMe('missing')).rejects.toThrow('User not found');
    });
});
