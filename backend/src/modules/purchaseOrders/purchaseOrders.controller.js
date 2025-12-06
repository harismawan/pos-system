/**
 * Purchase Orders controller
 */

import * as purchaseOrdersService from './purchaseOrders.service.js';
import logger from '../../libs/logger.js';
import { POR } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getPurchaseOrdersController({ query, store, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await purchaseOrdersService.getPurchaseOrders({ ...query, outletId });

        return successResponse(POR.LIST_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get purchase orders failed');
        set.status = 500;
        return errorResponse(POR.LIST_FAILED, err.message || 'Failed to retrieve purchase orders');
    }
}

export async function getPurchaseOrderByIdController({ params, set }) {
    try {
        const order = await purchaseOrdersService.getPurchaseOrderById(params.id);

        return successResponse(POR.GET_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Get purchase order failed');
        set.status = err.message === 'Purchase order not found' ? 404 : 500;
        const code = err.message === 'Purchase order not found' ? POR.NOT_FOUND : POR.LIST_FAILED;
        return errorResponse(code, err.message || 'Failed to retrieve purchase order');
    }
}

export async function createPurchaseOrderController({ body, store, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.createPurchaseOrder(body, userId);

        set.status = 201;
        return successResponse(POR.CREATE_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Create purchase order failed');
        set.status = 400;
        return errorResponse(POR.CREATE_FAILED, err.message || 'Failed to create purchase order');
    }
}

export async function updatePurchaseOrderController({ params, body, store, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.updatePurchaseOrder(params.id, body, userId);

        return successResponse(POR.UPDATE_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Update purchase order failed');
        set.status = 400;
        return errorResponse(POR.UPDATE_FAILED, err.message || 'Failed to update purchase order');
    }
}

export async function receivePurchaseOrderController({ params, body, store, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.receivePurchaseOrder(
            params.id,
            body.receivedItems,
            userId
        );

        return successResponse(POR.RECEIVE_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Receive purchase order failed');
        set.status = 400;
        return errorResponse(POR.RECEIVE_FAILED, err.message || 'Failed to receive purchase order');
    }
}

export async function cancelPurchaseOrderController({ params, store, set }) {
    try {
        const userId = store.user.id;
        const order = await purchaseOrdersService.cancelPurchaseOrder(params.id, userId);

        return successResponse(POR.CANCEL_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Cancel purchase order failed');
        set.status = 400;
        return errorResponse(POR.CANCEL_FAILED, err.message || 'Failed to cancel purchase order');
    }
}
