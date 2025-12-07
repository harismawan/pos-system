/**
 * Inventory controller
 */

import * as inventoryService from './inventory.service.js';
import logger from '../../libs/logger.js';
import { INV } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getInventoryController({ query, store, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await inventoryService.getInventory({ ...query, outletId });

        return successResponse(INV.GET_SUCCESS, result);
    } catch (err) {
        logger.error({ err }, 'Get inventory failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(INV.GET_FAILED, message);
    }
}

export async function adjustInventoryController({ body, store, set }) {
    try {
        const userId = store.user.id;
        const outletId = store.outletId || body.outletId;

        const result = await inventoryService.adjustInventory(
            { ...body, outletId },
            userId
        );

        return successResponse(INV.ADJUST_SUCCESS, result);
    } catch (err) {
        logger.error({ err }, 'Adjust inventory failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(INV.ADJUST_FAILED, message);
    }
}

export async function transferInventoryController({ body, store, set }) {
    try {
        const userId = store.user.id;
        const outletId = store.outletId || body.outletId;

        const result = await inventoryService.transferInventory(
            { ...body, outletId },
            userId
        );

        return successResponse(INV.TRANSFER_SUCCESS, result);
    } catch (err) {
        logger.error({ err }, 'Transfer inventory failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(INV.TRANSFER_FAILED, message);
    }
}

export async function getStockMovementsController({ query, store, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await inventoryService.getStockMovements({ ...query, outletId });

        return successResponse(INV.MOVEMENTS_SUCCESS, result);
    } catch (err) {
        logger.error({ err }, 'Get stock movements failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(INV.MOVEMENTS_FAILED, message);
    }
}
