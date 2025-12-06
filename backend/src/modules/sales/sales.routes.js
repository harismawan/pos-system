/**
 * Sales routes
 */

import { Elysia } from 'elysia';
import * as salesController from './sales.controller.js';
import * as salesSchemas from './sales.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const salesRoutes = new Elysia({ prefix: '/sales' })
    .use(withRequestLogger())
    .post('/orders', salesController.createPosOrderController, {
        beforeHandle: authMiddleware,
        ...salesSchemas.createPosOrderBodySchema,
    })
    .get('/orders', salesController.getPosOrdersController, {
        beforeHandle: authMiddleware,
        ...salesSchemas.getPosOrdersQuerySchema,
    })
    .get('/orders/:id', salesController.getPosOrderByIdController, {
        beforeHandle: authMiddleware,
        ...salesSchemas.posOrderIdParamSchema,
    })
    .post('/orders/:id/complete', salesController.completePosOrderController, {
        beforeHandle: authMiddleware,
        ...salesSchemas.posOrderIdParamSchema,
    })
    .post('/orders/:id/cancel', salesController.cancelPosOrderController, {
        beforeHandle: authMiddleware,
        ...salesSchemas.posOrderIdParamSchema,
    })
    .post('/orders/:id/payments', salesController.addPaymentController, {
        beforeHandle: authMiddleware,
        ...salesSchemas.addPaymentBodySchema,
    });
