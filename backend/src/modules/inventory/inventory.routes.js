/**
 * Inventory routes
 */

import { Elysia } from 'elysia';
import * as inventoryController from './inventory.controller.js';
import * as inventorySchemas from './inventory.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const inventoryRoutes = new Elysia({ prefix: '/inventory' })
    .use(withRequestLogger())
    .get('/', inventoryController.getInventoryController, {
        beforeHandle: authMiddleware,
        ...inventorySchemas.getInventoryQuerySchema,
    })
    .post('/adjust', inventoryController.adjustInventoryController, {
        beforeHandle: authMiddleware,
        ...inventorySchemas.adjustInventoryBodySchema,
    })
    .post('/transfer', inventoryController.transferInventoryController, {
        beforeHandle: authMiddleware,
        ...inventorySchemas.transferInventoryBodySchema,
    })
    .get('/movements', inventoryController.getStockMovementsController, {
        beforeHandle: authMiddleware,
        ...inventorySchemas.getStockMovementsQuerySchema,
    });
