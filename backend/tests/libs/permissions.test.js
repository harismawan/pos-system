import '../testSetup.js';
import { describe, it, expect } from 'bun:test';
import { PERMISSIONS, hasPermission, getPermissionsForRole, requirePermission, requireAnyPermission } from '../../src/libs/permissions.js';

describe('libs/permissions', () => {
    it('checks permissions by role', () => {
        expect(hasPermission('OWNER', PERMISSIONS.PRODUCTS_CREATE)).toBe(true);
        expect(hasPermission('CASHIER', PERMISSIONS.PRODUCTS_DELETE)).toBe(false);
        expect(hasPermission('UNKNOWN', PERMISSIONS.PRODUCTS_VIEW)).toBe(false);
    });

    it('gets permissions for known and unknown roles', () => {
        expect(getPermissionsForRole('OWNER').length).toBeGreaterThan(0);
        expect(getPermissionsForRole('UNKNOWN')).toEqual([]);
    });

    it('returns 401 when no user is present', () => {
        const guard = requirePermission(PERMISSIONS.PRODUCTS_VIEW);
        const set = {};
        const result = guard({ store: {}, set });

        expect(set.status).toBe(401);
        expect(result.success).toBe(false);
    });

    it('returns 403 when user lacks permission', () => {
        const guard = requirePermission(PERMISSIONS.PRODUCTS_DELETE);
        const set = {};
        const result = guard({ store: { user: { role: 'CASHIER' } }, set });

        expect(set.status).toBe(403);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Permission denied');
    });

    it('allows when any required permission is present', () => {
        const guard = requireAnyPermission([PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_DELETE]);
        const set = {};
        const result = guard({ store: { user: { role: 'CASHIER' } }, set });

        expect(result).toBeUndefined();
        expect(set.status).toBeUndefined();
    });

    it('returns 401 for requireAnyPermission when no user', () => {
        const guard = requireAnyPermission([PERMISSIONS.PRODUCTS_VIEW]);
        const set = {};
        const result = guard({ store: {}, set });
        expect(set.status).toBe(401);
        expect(result.success).toBe(false);
    });

    it('returns 403 when no matching permission in requireAnyPermission', () => {
        const guard = requireAnyPermission([PERMISSIONS.PRODUCTS_DELETE, PERMISSIONS.PURCHASE_EDIT]);
        const set = {};
        const result = guard({ store: { user: { role: 'CASHIER' } }, set });
        expect(set.status).toBe(403);
        expect(result.error).toContain('Permission denied');
    });
});
