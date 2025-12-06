/**
 * Warehouses controller
 */

import * as warehousesService from './warehouses.service.js';
import logger from '../../libs/logger.js';
import { WAR } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getWarehousesController({ query, set }) {
    try {
        const result = await warehousesService.getWarehouses(query);

        return successResponse(WAR.LIST_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get warehouses failed');
        set.status = 500;
        return errorResponse(WAR.LIST_FAILED, err.message || 'Failed to retrieve warehouses');
    }
}

export async function getWarehouseByIdController({ params, set }) {
    try {
        const warehouse = await warehousesService.getWarehouseById(params.id);

        return successResponse(WAR.GET_SUCCESS, warehouse);
    } catch (err) {
        logger.debug({ err }, 'Get warehouse failed');
        set.status = err.message === 'Warehouse not found' ? 404 : 500;
        const code = err.message === 'Warehouse not found' ? WAR.NOT_FOUND : WAR.LIST_FAILED;
        return errorResponse(code, err.message || 'Failed to retrieve warehouse');
    }
}

export async function createWarehouseController({ body, store, set }) {
    try {
        const userId = store.user.id;
        const warehouse = await warehousesService.createWarehouse(body, userId);

        set.status = 201;
        return successResponse(WAR.CREATE_SUCCESS, warehouse);
    } catch (err) {
        logger.debug({ err }, 'Create warehouse failed');
        set.status = 400;
        return errorResponse(WAR.CREATE_FAILED, err.message || 'Failed to create warehouse');
    }
}

export async function updateWarehouseController({ params, body, store, set }) {
    try {
        const userId = store.user.id;
        const warehouse = await warehousesService.updateWarehouse(params.id, body, userId);

        return successResponse(WAR.UPDATE_SUCCESS, warehouse);
    } catch (err) {
        logger.debug({ err }, 'Update warehouse failed');
        set.status = 400;
        return errorResponse(WAR.UPDATE_FAILED, err.message || 'Failed to update warehouse');
    }
}

export async function deleteWarehouseController({ params, set }) {
    try {
        const result = await warehousesService.deleteWarehouse(params.id);

        return successResponse(WAR.DELETE_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Delete warehouse failed');
        set.status = 400;
        return errorResponse(WAR.DELETE_FAILED, err.message || 'Failed to delete warehouse');
    }
}

export async function getWarehouseInventoryController({ params, query, set }) {
    try {
        const result = await warehousesService.getWarehouseInventory(params.id, query);

        return successResponse(WAR.GET_INVENTORY_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get warehouse inventory failed');
        set.status = 500;
        return errorResponse(WAR.GET_INVENTORY_FAILED, err.message || 'Failed to retrieve warehouse inventory');
    }
}
