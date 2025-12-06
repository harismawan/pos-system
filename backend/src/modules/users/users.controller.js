/**
 * Users controller - Route handlers
 */

import * as usersService from './users.service.js';
import { enqueueAuditLogJob } from '../../libs/jobs.js';

export async function getUsersController({ query, store }) {
    const { page, limit, search, role, isActive } = query;

    const result = await usersService.getUsers({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search,
        role,
        isActive,
    });

    return {
        success: true,
        ...result,
    };
}

export async function getUserByIdController({ params, store }) {
    const user = await usersService.getUserById(params.id);

    return {
        success: true,
        user,
    };
}

export async function createUserController({ body, store, set }) {
    try {
        const user = await usersService.createUser(body);

        // Audit log
        enqueueAuditLogJob({
            eventType: 'USER_CREATED',
            userId: store.user?.id,
            outletId: store.outletId,
            entityType: 'User',
            entityId: user.id,
            payload: { name: user.name, username: user.username, role: user.role },
        });

        set.status = 201;
        return {
            success: true,
            user,
        };
    } catch (err) {
        set.status = err.statusCode || 500;
        return {
            success: false,
            error: err.message,
        };
    }
}

export async function updateUserController({ params, body, store, set }) {
    try {
        const user = await usersService.updateUser(params.id, body);

        // Audit log
        enqueueAuditLogJob({
            eventType: 'USER_UPDATED',
            userId: store.user?.id,
            outletId: store.outletId,
            entityType: 'User',
            entityId: user.id,
            payload: { changes: Object.keys(body) },
        });

        return {
            success: true,
            user,
        };
    } catch (err) {
        set.status = err.statusCode || 500;
        return {
            success: false,
            error: err.message,
        };
    }
}

export async function deleteUserController({ params, store, set }) {
    try {
        await usersService.deleteUser(params.id, store.user?.id);

        // Audit log
        enqueueAuditLogJob({
            eventType: 'USER_DELETED',
            userId: store.user?.id,
            outletId: store.outletId,
            entityType: 'User',
            entityId: params.id,
            payload: {},
        });

        return {
            success: true,
            message: 'User deactivated successfully',
        };
    } catch (err) {
        set.status = err.statusCode || 500;
        return {
            success: false,
            error: err.message,
        };
    }
}

export async function assignOutletController({ params, body, store, set }) {
    try {
        const outletUser = await usersService.assignUserToOutlet(
            params.id,
            body.outletId,
            body.outletRole,
            body.isDefault
        );

        // Audit log
        enqueueAuditLogJob({
            eventType: 'USER_OUTLET_ASSIGNED',
            userId: store.user?.id,
            outletId: body.outletId,
            entityType: 'OutletUser',
            entityId: outletUser.id,
            payload: { userId: params.id, outletRole: body.outletRole },
        });

        return {
            success: true,
            outletUser,
        };
    } catch (err) {
        set.status = err.statusCode || 500;
        return {
            success: false,
            error: err.message,
        };
    }
}

export async function removeOutletController({ params, store, set }) {
    try {
        await usersService.removeUserFromOutlet(params.id, params.outletId);

        // Audit log
        enqueueAuditLogJob({
            eventType: 'USER_OUTLET_REMOVED',
            userId: store.user?.id,
            outletId: params.outletId,
            entityType: 'OutletUser',
            entityId: `${params.id}_${params.outletId}`,
            payload: { userId: params.id },
        });

        return {
            success: true,
            message: 'User removed from outlet',
        };
    } catch (err) {
        set.status = err.statusCode || 500;
        return {
            success: false,
            error: err.message,
        };
    }
}
