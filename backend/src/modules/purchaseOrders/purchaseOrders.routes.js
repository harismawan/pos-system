/**
 * Purchase Orders routes
 */

import { Elysia } from 'elysia';
import * as purchaseOrdersController from './purchaseOrders.controller.js';
import * as purchaseOrdersSchemas from './purchaseOrders.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { requirePermission, PERMISSIONS } from '../../libs/permissions.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const purchaseOrdersRoutes = new Elysia({ prefix: '/purchase-orders' })
    .use(withRequestLogger())
    .get('/', purchaseOrdersController.getPurchaseOrdersController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PURCHASE_VIEW)],
        ...purchaseOrdersSchemas.getPurchaseOrdersQuerySchema,
    })
    .get('/:id', purchaseOrdersController.getPurchaseOrderByIdController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PURCHASE_VIEW)],
        ...purchaseOrdersSchemas.purchaseOrderIdParamSchema,
    })
    .post('/', purchaseOrdersController.createPurchaseOrderController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PURCHASE_CREATE)],
        ...purchaseOrdersSchemas.createPurchaseOrderBodySchema,
    })
    .put('/:id', purchaseOrdersController.updatePurchaseOrderController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PURCHASE_EDIT)],
        ...purchaseOrdersSchemas.updatePurchaseOrderBodySchema,
    })
    .post('/:id/receive', purchaseOrdersController.receivePurchaseOrderController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PURCHASE_RECEIVE)],
        ...purchaseOrdersSchemas.receiveItemsBodySchema,
    })
    .post('/:id/cancel', purchaseOrdersController.cancelPurchaseOrderController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PURCHASE_EDIT)],
        ...purchaseOrdersSchemas.purchaseOrderIdParamSchema,
    });
