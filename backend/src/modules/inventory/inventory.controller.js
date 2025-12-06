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
        logger.debug({ err }, 'Get inventory failed');
        set.status = 500;
        return errorResponse(INV.GET_FAILED, err.message || 'Failed to retrieve inventory');
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
        logger.debug({ err }, 'Adjust inventory failed');
        set.status = 400;
        return errorResponse(INV.ADJUST_FAILED, err.message || 'Failed to adjust inventory');
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
        logger.debug({ err }, 'Transfer inventory failed');
        set.status = 400;
        return errorResponse(INV.TRANSFER_FAILED, err.message || 'Failed to transfer inventory');
    }
}

export async function getStockMovementsController({ query, store, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await inventoryService.getStockMovements({ ...query, outletId });

        return successResponse(INV.MOVEMENTS_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get stock movements failed');
        set.status = 500;
        return errorResponse(INV.MOVEMENTS_FAILED, err.message || 'Failed to retrieve stock movements');
    }
}
