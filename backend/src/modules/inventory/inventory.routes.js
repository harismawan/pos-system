/**
 * Inventory routes
 */

import { Elysia } from 'elysia';
import * as inventoryController from './inventory.controller.js';
import * as inventorySchemas from './inventory.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { requirePermission, PERMISSIONS } from '../../libs/permissions.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const inventoryRoutes = new Elysia({ prefix: '/inventory' })
    .use(withRequestLogger())
    .get('/', inventoryController.getInventoryController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.INVENTORY_VIEW)],
        ...inventorySchemas.getInventoryQuerySchema,
    })
    .post('/adjust', inventoryController.adjustInventoryController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.INVENTORY_ADJUST)],
        ...inventorySchemas.adjustInventoryBodySchema,
    })
    .post('/transfer', inventoryController.transferInventoryController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.INVENTORY_TRANSFER)],
        ...inventorySchemas.transferInventoryBodySchema,
    })
    .get('/movements', inventoryController.getStockMovementsController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.INVENTORY_VIEW)],
        ...inventorySchemas.getStockMovementsQuerySchema,
    });
