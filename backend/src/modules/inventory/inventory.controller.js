/**
 * Inventory controller
 */

import * as inventoryService from './inventory.service.js';
import logger from '../../libs/logger.js';

export async function getInventoryController({ query, request, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await inventoryService.getInventory({ ...query, outletId });

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get inventory failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve inventory',
        };
    }
}

export async function adjustInventoryController({ body, request, set }) {
    try {
        const userId = store.user.id;
        const outletId = store.outletId || body.outletId;

        const result = await inventoryService.adjustInventory(
            { ...body, outletId },
            userId
        );

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Adjust inventory failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to adjust inventory',
        };
    }
}

export async function transferInventoryController({ body, request, set }) {
    try {
        const userId = store.user.id;
        const outletId = store.outletId || body.outletId;

        const result = await inventoryService.transferInventory(
            { ...body, outletId },
            userId
        );

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Transfer inventory failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to transfer inventory',
        };
    }
}

export async function getStockMovementsController({ query, request, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await inventoryService.getStockMovements({ ...query, outletId });

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get stock movements failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve stock movements',
        };
    }
}
