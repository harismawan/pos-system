/**
 * Suppliers controller
 */

import * as suppliersService from './suppliers.service.js';
import logger from '../../libs/logger.js';

export async function getSuppliersController({ query, set }) {
    try {
        const result = await suppliersService.getSuppliers(query);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get suppliers failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve suppliers',
        };
    }
}

export async function getSupplierByIdController({ params, set }) {
    try {
        const supplier = await suppliersService.getSupplierById(params.id);

        return {
            success: true,
            data: supplier,
        };
    } catch (err) {
        logger.error({ err }, 'Get supplier failed');
        set.status = err.message === 'Supplier not found' ? 404 : 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve supplier',
        };
    }
}

export async function createSupplierController({ body, set }) {
    try {
        const supplier = await suppliersService.createSupplier(body);

        set.status = 201;
        return {
            success: true,
            data: supplier,
        };
    } catch (err) {
        logger.error({ err }, 'Create supplier failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create supplier',
        };
    }
}

export async function updateSupplierController({ params, body, set }) {
    try {
        const supplier = await suppliersService.updateSupplier(params.id, body);

        return {
            success: true,
            data: supplier,
        };
    } catch (err) {
        logger.error({ err }, 'Update supplier failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to update supplier',
        };
    }
}

export async function deleteSupplierController({ params, set }) {
    try {
        const result = await suppliersService.deleteSupplier(params.id);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Delete supplier failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to delete supplier',
        };
    }
}
