/**
 * Suppliers controller
 */

import * as suppliersService from './suppliers.service.js';
import logger from '../../libs/logger.js';
import { SUP } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getSuppliersController({ query, set }) {
    try {
        const result = await suppliersService.getSuppliers(query);

        return successResponse(SUP.LIST_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get suppliers failed');
        set.status = 500;
        return errorResponse(SUP.LIST_FAILED, err.message || 'Failed to retrieve suppliers');
    }
}

export async function getSupplierByIdController({ params, set }) {
    try {
        const supplier = await suppliersService.getSupplierById(params.id);

        return successResponse(SUP.GET_SUCCESS, supplier);
    } catch (err) {
        logger.debug({ err }, 'Get supplier failed');
        set.status = err.message === 'Supplier not found' ? 404 : 500;
        const code = err.message === 'Supplier not found' ? SUP.NOT_FOUND : SUP.LIST_FAILED;
        return errorResponse(code, err.message || 'Failed to retrieve supplier');
    }
}

export async function createSupplierController({ body, set }) {
    try {
        const supplier = await suppliersService.createSupplier(body);

        set.status = 201;
        return successResponse(SUP.CREATE_SUCCESS, supplier);
    } catch (err) {
        logger.debug({ err }, 'Create supplier failed');
        set.status = 400;
        return errorResponse(SUP.CREATE_FAILED, err.message || 'Failed to create supplier');
    }
}

export async function updateSupplierController({ params, body, set }) {
    try {
        const supplier = await suppliersService.updateSupplier(params.id, body);

        return successResponse(SUP.UPDATE_SUCCESS, supplier);
    } catch (err) {
        logger.debug({ err }, 'Update supplier failed');
        set.status = 400;
        return errorResponse(SUP.UPDATE_FAILED, err.message || 'Failed to update supplier');
    }
}

export async function deleteSupplierController({ params, set }) {
    try {
        const result = await suppliersService.deleteSupplier(params.id);

        return successResponse(SUP.DELETE_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Delete supplier failed');
        set.status = 400;
        return errorResponse(SUP.DELETE_FAILED, err.message || 'Failed to delete supplier');
    }
}
