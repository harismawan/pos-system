/**
 * Purchase Orders routes
 */

import { Elysia } from 'elysia';
import * as purchaseOrdersController from './purchaseOrders.controller.js';
import * as purchaseOrdersSchemas from './purchaseOrders.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const purchaseOrdersRoutes = new Elysia({ prefix: '/purchase-orders' })
    .use(withRequestLogger())
    .get('/', purchaseOrdersController.getPurchaseOrdersController, {
        beforeHandle: authMiddleware,
        ...purchaseOrdersSchemas.getPurchaseOrdersQuerySchema,
    })
    .get('/:id', purchaseOrdersController.getPurchaseOrderByIdController, {
        beforeHandle: authMiddleware,
        ...purchaseOrdersSchemas.purchaseOrderIdParamSchema,
    })
    .post('/', purchaseOrdersController.createPurchaseOrderController, {
        beforeHandle: authMiddleware,
        ...purchaseOrdersSchemas.createPurchaseOrderBodySchema,
    })
    .put('/:id', purchaseOrdersController.updatePurchaseOrderController, {
        beforeHandle: authMiddleware,
        ...purchaseOrdersSchemas.updatePurchaseOrderBodySchema,
    })
    .post('/:id/receive', purchaseOrdersController.receivePurchaseOrderController, {
        beforeHandle: authMiddleware,
        ...purchaseOrdersSchemas.receiveItemsBodySchema,
    })
    .post('/:id/cancel', purchaseOrdersController.cancelPurchaseOrderController, {
        beforeHandle: authMiddleware,
        ...purchaseOrdersSchemas.purchaseOrderIdParamSchema,
    });
