/**
 * Products routes
 */

import { Elysia } from 'elysia';
import * as productsController from './products.controller.js';
import * as productsSchemas from './products.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const productsRoutes = new Elysia({ prefix: '/products' })
    .use(withRequestLogger())
    .get('/', productsController.getProductsController, {
        beforeHandle: authMiddleware,
        ...productsSchemas.getProductsQuerySchema,
    })
    .get('/:id', productsController.getProductByIdController, {
        beforeHandle: authMiddleware,
        ...productsSchemas.productIdParamSchema,
    })
    .post('/', productsController.createProductController, {
        beforeHandle: authMiddleware,
        ...productsSchemas.createProductBodySchema,
    })
    .put('/:id', productsController.updateProductController, {
        beforeHandle: authMiddleware,
        ...productsSchemas.updateProductBodySchema,
    })
    .delete('/:id', productsController.deleteProductController, {
        beforeHandle: authMiddleware,
        ...productsSchemas.productIdParamSchema,
    });
