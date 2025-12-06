/**
 * Sales controller
 */

import * as salesService from './sales.service.js';
import logger from '../../libs/logger.js';
import { SAL } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function createPosOrderController({ body, store, set }) {
    try {
        const userId = store.user.id;
        const order = await salesService.createPosOrder(body, userId);

        set.status = 201;
        return successResponse(SAL.CREATE_ORDER_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Create POS order failed');
        set.status = 400;
        return errorResponse(SAL.CREATE_FAILED, err.message || 'Failed to create order');
    }
}

export async function getPosOrdersController({ query, store, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await salesService.getPosOrders({ ...query, outletId });

        return successResponse(SAL.LIST_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Get POS orders failed');
        set.status = 500;
        return errorResponse(SAL.LIST_FAILED, err.message || 'Failed to retrieve orders');
    }
}

export async function getPosOrderByIdController({ params, set }) {
    try {
        const order = await salesService.getPosOrderById(params.id);

        return successResponse(SAL.GET_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Get POS order failed');
        set.status = err.message === 'Order not found' ? 404 : 500;
        const code = err.message === 'Order not found' ? SAL.NOT_FOUND : SAL.LIST_FAILED;
        return errorResponse(code, err.message || 'Failed to retrieve order');
    }
}

export async function completePosOrderController({ params, store, set }) {
    try {
        const userId = store.user.id;
        const order = await salesService.completePosOrder(params.id, userId);

        return successResponse(SAL.COMPLETE_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Complete POS order failed');
        set.status = 400;
        return errorResponse(SAL.COMPLETE_FAILED, err.message || 'Failed to complete order');
    }
}

export async function cancelPosOrderController({ params, store, set }) {
    try {
        const userId = store.user.id;
        const order = await salesService.cancelPosOrder(params.id, userId);

        return successResponse(SAL.CANCEL_SUCCESS, order);
    } catch (err) {
        logger.debug({ err }, 'Cancel POS order failed');
        set.status = 400;
        return errorResponse(SAL.CANCEL_FAILED, err.message || 'Failed to cancel order');
    }
}

export async function addPaymentController({ params, body, set }) {
    try {
        const result = await salesService.addPayment(params.id, body);

        set.status = 201;
        return successResponse(SAL.ADD_PAYMENT_SUCCESS, result);
    } catch (err) {
        logger.debug({ err }, 'Add payment failed');
        set.status = 400;
        return errorResponse(SAL.PAYMENT_FAILED, err.message || 'Failed to add payment');
    }
}
