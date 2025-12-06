/**
 * Products controller
 */

import * as productsService from './products.service.js';
import logger from '../../libs/logger.js';
import { PRD } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getProductsController({ query, store, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await productsService.getProducts({ ...query, outletId });

        return successResponse(PRD.LIST_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get products failed');
        set.status = 500;
        return errorResponse(PRD.LIST_FAILED, err.message || 'Failed to retrieve products');
    }
}

export async function getProductByIdController({ params, set }) {
    try {
        const product = await productsService.getProductById(params.id);

        return successResponse(PRD.GET_SUCCESS, product);
    } catch (err) {
        logger.debug({ err }, 'Get product failed');
        set.status = err.message === 'Product not found' ? 404 : 500;
        const code = err.message === 'Product not found' ? PRD.NOT_FOUND : PRD.LIST_FAILED;
        return errorResponse(code, err.message || 'Failed to retrieve product');
    }
}

export async function createProductController({ body, set }) {
    try {
        const product = await productsService.createProduct(body);

        set.status = 201;
        return successResponse(PRD.CREATE_SUCCESS, product);
    } catch (err) {
        logger.debug({ err }, 'Create product failed');
        set.status = 400;
        return errorResponse(PRD.CREATE_FAILED, err.message || 'Failed to create product');
    }
}

export async function updateProductController({ params, body, set }) {
    try {
        const product = await productsService.updateProduct(params.id, body);

        return successResponse(PRD.UPDATE_SUCCESS, product);
    } catch (err) {
        logger.debug({ err }, 'Update product failed');
        set.status = 400;
        return errorResponse(PRD.UPDATE_FAILED, err.message || 'Failed to update product');
    }
}

export async function deleteProductController({ params, set }) {
    try {
        const result = await productsService.deleteProduct(params.id);

        return successResponse(PRD.DELETE_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Delete product failed');
        set.status = 400;
        return errorResponse(PRD.DELETE_FAILED, err.message || 'Failed to delete product');
    }
}
