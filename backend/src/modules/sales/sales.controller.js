/**
 * Sales controller
 */

import * as salesService from './sales.service.js';
import logger from '../../libs/logger.js';

export async function createPosOrderController({ body, request, set }) {
    try {
        const userId = store.user.id;
        const order = await salesService.createPosOrder(body, userId);

        set.status = 201;
        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Create POS order failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create order',
        };
    }
}

export async function getPosOrdersController({ query, request, set }) {
    try {
        const outletId = store.outletId || query.outletId;
        const result = await salesService.getPosOrders({ ...query, outletId });

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Get POS orders failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve orders',
        };
    }
}

export async function getPosOrderByIdController({ params, set }) {
    try {
        const order = await salesService.getPosOrderById(params.id);

        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Get POS order failed');
        set.status = err.message === 'Order not found' ? 404 : 500;
        return {
            success: false,
            error: err.message || 'Failed to retrieve order',
        };
    }
}

export async function completePosOrderController({ params, request, set }) {
    try {
        const userId = store.user.id;
        const order = await salesService.completePosOrder(params.id, userId);

        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Complete POS order failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to complete order',
        };
    }
}

export async function cancelPosOrderController({ params, request, set }) {
    try {
        const userId = store.user.id;
        const order = await salesService.cancelPosOrder(params.id, userId);

        return {
            success: true,
            data: order,
        };
    } catch (err) {
        logger.error({ err }, 'Cancel POS order failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to cancel order',
        };
    }
}

export async function addPaymentController({ params, body, set }) {
    try {
        const result = await salesService.addPayment(params.id, body);

        set.status = 201;
        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Add payment failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to add payment',
        };
    }
}
