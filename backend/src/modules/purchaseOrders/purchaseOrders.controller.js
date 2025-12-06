/**
 * Purchase Orders controller
 */

import * as purchaseOrdersService from './purchaseOrders.service.js';
import logger from '../../libs/logger.js';

export async function getPurchaseOrdersController({ query, request, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await purchaseOrdersService.getPurchaseOrders({ ...query, outletId });

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get purchase orders failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve purchase orders',
        };
    }
}

export async function getPurchaseOrderByIdController({ params, set }) {
    try {
        const order = await purchaseOrdersService.getPurchaseOrderById(params.id);

        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Get purchase order failed');
        set.status = err.message === 'Purchase order not found' ? 404 : 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve purchase order',
        };
    }
}

export async function createPurchaseOrderController({ body, request, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.createPurchaseOrder(body, userId);

        set.status = 201;
        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Create purchase order failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create purchase order',
        };
    }
}

export async function updatePurchaseOrderController({ params, body, request, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.updatePurchaseOrder(params.id, body, userId);

        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Update purchase order failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to update purchase order',
        };
    }
}

export async function receivePurchaseOrderController({ params, body, request, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.receivePurchaseOrder(
            params.id,
            body.receivedItems,
            userId
        );

        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Receive purchase order failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to receive purchase order',
        };
    }
}

export async function cancelPurchaseOrderController({ params, request, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.cancelPurchaseOrder(params.id, userId);

        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Cancel purchase order failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to cancel purchase order',
        };
    }
}
