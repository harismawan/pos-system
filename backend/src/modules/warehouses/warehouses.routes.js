/**
 * Warehouses routes
 */

import { Elysia } from 'elysia';
import * as warehousesController from './warehouses.controller.js';
import * as warehousesSchemas from './warehouses.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const warehousesRoutes = new Elysia({ prefix: '/warehouses' })
    .use(withRequestLogger())
    .get('/', warehousesController.getWarehousesController, {
        beforeHandle: authMiddleware,
        ...warehousesSchemas.getWarehousesQuerySchema,
    })
    .get('/:id', warehousesController.getWarehouseByIdController, {
        beforeHandle: authMiddleware,
        ...warehousesSchemas.warehouseIdParamSchema,
    })
    .post('/', warehousesController.createWarehouseController, {
        beforeHandle: authMiddleware,
        ...warehousesSchemas.createWarehouseBodySchema,
    })
    .put('/:id', warehousesController.updateWarehouseController, {
        beforeHandle: authMiddleware,
        ...warehousesSchemas.updateWarehouseBodySchema,
    })
    .delete('/:id', warehousesController.deleteWarehouseController, {
        beforeHandle: authMiddleware,
        ...warehousesSchemas.warehouseIdParamSchema,
    })
    .get('/:id/inventory', warehousesController.getWarehouseInventoryController, {
        beforeHandle: authMiddleware,
        ...warehousesSchemas.getWarehouseInventoryQuerySchema,
    });
