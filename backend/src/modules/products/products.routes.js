/**
 * Products routes
 */

import { Elysia } from 'elysia';
import * as productsController from './products.controller.js';
import * as productsSchemas from './products.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { requirePermission, PERMISSIONS } from '../../libs/permissions.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const productsRoutes = new Elysia({ prefix: '/products' })
    .use(withRequestLogger())
    .get('/', productsController.getProductsController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_VIEW)],
        ...productsSchemas.getProductsQuerySchema,
    })
    .get('/:id', productsController.getProductByIdController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_VIEW)],
        ...productsSchemas.productIdParamSchema,
    })
    .post('/', productsController.createProductController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_CREATE)],
        ...productsSchemas.createProductBodySchema,
    })
    .put('/:id', productsController.updateProductController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_EDIT)],
        ...productsSchemas.updateProductBodySchema,
    })
    .delete('/:id', productsController.deleteProductController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_DELETE)],
        ...productsSchemas.productIdParamSchema,
    });
