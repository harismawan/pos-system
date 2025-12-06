/**
 * Reports routes
 */

import { Elysia } from 'elysia';
import * as reportsController from './reports.controller.js';
import * as reportsSchemas from './reports.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const reportsRoutes = new Elysia({ prefix: '/reports' })
    .use(withRequestLogger())
    .get('/sales-summary', reportsController.getSalesSummaryController, {
        beforeHandle: authMiddleware,
        ...reportsSchemas.salesSummarySchema,
    })
    .get('/top-products', reportsController.getTopProductsController, {
        beforeHandle: authMiddleware,
        ...reportsSchemas.topProductsSchema,
    })
    .get('/inventory-valuation', reportsController.getInventoryValuationController, {
        beforeHandle: authMiddleware,
        ...reportsSchemas.inventoryValuationSchema,
    })
    .get('/stock-movements', reportsController.getStockMovementsController, {
        beforeHandle: authMiddleware,
        ...reportsSchemas.stockMovementsSchema,
    })
    .get('/order-history', reportsController.getOrderHistoryController, {
        beforeHandle: authMiddleware,
        ...reportsSchemas.orderHistorySchema,
    });
