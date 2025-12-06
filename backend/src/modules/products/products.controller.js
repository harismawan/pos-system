/**
 * Products controller
 */

import * as productsService from './products.service.js';
import logger from '../../libs/logger.js';

export async function getProductsController({ query, store, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await productsService.getProducts({ ...query, outletId });

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get products failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve products',
        };
    }
}

export async function getProductByIdController({ params, set }) {
    try {
        const product = await productsService.getProductById(params.id);

        return {
            success: true,
            data: product,
        };
    } catch (err) {
        logger.error({ err }, 'Get product failed');
        set.status = err.message === 'Product not found' ? 404 : 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve product',
        };
    }
}

export async function createProductController({ body, set }) {
    try {
        const product = await productsService.createProduct(body);

        set.status = 201;
        return {
            success: true,
            data: product,
        };
    } catch (err) {
        logger.error({ err }, 'Create product failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create product',
        };
    }
}

export async function updateProductController({ params, body, set }) {
    try {
        const product = await productsService.updateProduct(params.id, body);

        return {
            success: true,
            data: product,
        };
    } catch (err) {
        logger.error({ err }, 'Update product failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to update product',
        };
    }
}

export async function deleteProductController({ params, set }) {
    try {
        const result = await productsService.deleteProduct(params.id);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Delete product failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to delete product',
        };
    }
}
