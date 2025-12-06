/**
 * Outlets controller
 */

import * as outletsService from './outlets.service.js';
import logger from '../../libs/logger.js';

export async function getOutletsController({ query, set }) {
    try {
        const result = await outletsService.getOutlets(query);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get outlets failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve outlets',
        };
    }
}

export async function getOutletByIdController({ params, set }) {
    try {
        const outlet = await outletsService.getOutletById(params.id);

        return {
            success: true,
            data: outlet,
        };
    } catch (err) {
        logger.error({ err }, 'Get outlet failed');
        set.status = err.message === 'Outlet not found' ? 404 : 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve outlet',
        };
    }
}

export async function createOutletController({ body, request, set }) {
    try {
        const userId = store.user.id;
        const outlet = await outletsService.createOutlet(body, userId);

        set.status = 201;
        return {
            success: true,
            data: outlet,
        };
    } catch (err) {
        logger.error({ err }, 'Create outlet failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create outlet',
        };
    }
}

export async function updateOutletController({ params, body, request, set }) {
    try {
        const userId = store.user.id;
        const outlet = await outletsService.updateOutlet(params.id, body, userId);

        return {
            success: true,
            data: outlet,
        };
    } catch (err) {
        logger.error({ err }, 'Update outlet failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to update outlet',
        };
    }
}

export async function deleteOutletController({ params, set }) {
    try {
        const result = await outletsService.deleteOutlet(params.id);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Delete outlet failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to delete outlet',
        };
    }
}

export async function getOutletUsersController({ params, set }) {
    try {
        const users = await outletsService.getOutletUsers(params.id);

        return {
            success: true,
            data: users,
        };
    } catch (err) {
        logger.error({ err }, 'Get outlet users failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve outlet users',
        };
    }
}

export async function assignUserToOutletController({ params, body, request, set }) {
    try {
        const adminUserId = store.user.id;
        const outletUser = await outletsService.assignUserToOutlet(
            { ...body, outletId: params.id },
            adminUserId
        );

        set.status = 201;
        return {
            success: true,
            data: outletUser,
        };
    } catch (err) {
        logger.error({ err }, 'Assign user to outlet failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to assign user to outlet',
        };
    }
}

export async function removeUserFromOutletController({ params, request, set }) {
    try {
        const adminUserId = store.user.id;
        const result = await outletsService.removeUserFromOutlet(
            params.userId,
            params.id,
            adminUserId
        );

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Remove user from outlet failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to remove user from outlet',
        };
    }
}
