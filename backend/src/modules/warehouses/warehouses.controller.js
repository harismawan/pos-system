/**
 * Warehouses controller
 */

import * as warehousesService from './warehouses.service.js';
import logger from '../../libs/logger.js';

export async function getWarehousesController({ query, set }) {
    try {
        const result = await warehousesService.getWarehouses(query);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get warehouses failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve warehouses',
        };
    }
}

export async function getWarehouseByIdController({ params, set }) {
    try {
        const warehouse = await warehousesService.getWarehouseById(params.id);

        return {
            success: true,
            data: warehouse,
        };
    } catch (err) {
        logger.error({ err }, 'Get warehouse failed');
        set.status = err.message === 'Warehouse not found' ? 404 : 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve warehouse',
        };
    }
}

export async function createWarehouseController({ body, request, set }) {
    try {
        const userId = store.user.id;
        const warehouse = await warehousesService.createWarehouse(body, userId);

        set.status = 201;
        return {
            success: true,
            data: warehouse,
        };
    } catch (err) {
        logger.error({ err }, 'Create warehouse failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create warehouse',
        };
    }
}

export async function updateWarehouseController({ params, body, request, set }) {
    try {
        const userId = store.user.id;
        const warehouse = await warehousesService.updateWarehouse(params.id, body, userId);

        return {
            success: true,
            data: warehouse,
        };
    } catch (err) {
        logger.error({ err }, 'Update warehouse failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to update warehouse',
        };
    }
}

export async function deleteWarehouseController({ params, set }) {
    try {
        const result = await warehousesService.deleteWarehouse(params.id);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Delete warehouse failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to delete warehouse',
        };
    }
}

export async function getWarehouseInventoryController({ params, query, set }) {
    try {
        const result = await warehousesService.getWarehouseInventory(params.id, query);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get warehouse inventory failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve warehouse inventory',
        };
    }
}
