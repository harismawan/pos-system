/**
 * Outlets controller
 */

import * as outletsService from './outlets.service.js';
import logger from '../../libs/logger.js';
import { OUT } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getOutletsController({ query, set }) {
    try {
        const result = await outletsService.getOutlets(query);

        return successResponse(OUT.LIST_SUCCESS, result);
    } catch (err) {
        logger.error({ err }, 'Get outlets failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(OUT.LIST_FAILED, message);
    }
}

export async function getOutletByIdController({ params, set }) {
    try {
        const outlet = await outletsService.getOutletById(params.id);

        return successResponse(OUT.GET_SUCCESS, outlet);
    } catch (err) {
        logger.error({ err }, 'Get outlet failed');
        set.status = err.statusCode || (err.message === 'Outlet not found' ? 404 : 500);
        const code = (set.status === 404) ? OUT.NOT_FOUND : OUT.LIST_FAILED;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(code, message);
    }
}

export async function createOutletController({ body, store, set }) {
    try {
        const userId = store.user.id;
        const outlet = await outletsService.createOutlet(body, userId);

        set.status = 201;
        return successResponse(OUT.CREATE_SUCCESS, outlet);
    } catch (err) {
        logger.error({ err }, 'Create outlet failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(OUT.CREATE_FAILED, message);
    }
}

export async function updateOutletController({ params, body, store, set }) {
    try {
        const userId = store.user.id;
        const outlet = await outletsService.updateOutlet(params.id, body, userId);

        return successResponse(OUT.UPDATE_SUCCESS, outlet);
    } catch (err) {
        logger.error({ err }, 'Update outlet failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(OUT.UPDATE_FAILED, message);
    }
}

export async function deleteOutletController({ params, set }) {
    try {
        const result = await outletsService.deleteOutlet(params.id);

        return successResponse(OUT.DELETE_SUCCESS, result);
    } catch (err) {
        logger.error({ err }, 'Delete outlet failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(OUT.DELETE_FAILED, message);
    }
}

export async function getOutletUsersController({ params, set }) {
    try {
        const users = await outletsService.getOutletUsers(params.id);

        return successResponse(OUT.GET_USERS_SUCCESS, users);
    } catch (err) {
        logger.error({ err }, 'Get outlet users failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(OUT.GET_USERS_FAILED, message);
    }
}

export async function assignUserToOutletController({ params, body, store, set }) {
    try {
        const adminUserId = store.user.id;
        const outletUser = await outletsService.assignUserToOutlet(
            { ...body, outletId: params.id },
            adminUserId
        );

        set.status = 201;
        return successResponse(OUT.ASSIGN_USER_SUCCESS, outletUser);
    } catch (err) {
        logger.error({ err }, 'Assign user to outlet failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(OUT.ASSIGN_FAILED, message);
    }
}

export async function removeUserFromOutletController({ params, store, set }) {
    try {
        const adminUserId = store.user.id;
        const result = await outletsService.removeUserFromOutlet(
            params.userId,
            params.id,
            adminUserId
        );

        return successResponse(OUT.REMOVE_USER_SUCCESS, result);
    } catch (err) {
        logger.error({ err }, 'Remove user from outlet failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(OUT.REMOVE_FAILED, message);
    }
}
