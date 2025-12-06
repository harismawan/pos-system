/**
 * Suppliers routes
 */

import { Elysia } from 'elysia';
import * as suppliersController from './suppliers.controller.js';
import * as suppliersSchemas from './suppliers.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const suppliersRoutes = new Elysia({ prefix: '/suppliers' })
    .use(withRequestLogger())
    .get('/', suppliersController.getSuppliersController, {
        beforeHandle: authMiddleware,
        ...suppliersSchemas.getSuppliersQuerySchema,
    })
    .get('/:id', suppliersController.getSupplierByIdController, {
        beforeHandle: authMiddleware,
        ...suppliersSchemas.supplierIdParamSchema,
    })
    .post('/', suppliersController.createSupplierController, {
        beforeHandle: authMiddleware,
        ...suppliersSchemas.createSupplierBodySchema,
    })
    .put('/:id', suppliersController.updateSupplierController, {
        beforeHandle: authMiddleware,
        ...suppliersSchemas.updateSupplierBodySchema,
    })
    .delete('/:id', suppliersController.deleteSupplierController, {
        beforeHandle: authMiddleware,
        ...suppliersSchemas.supplierIdParamSchema,
    });
