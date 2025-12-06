/**
 * Customers routes
 */

import { Elysia } from 'elysia';
import * as customersController from './customers.controller.js';
import * as customersSchemas from './customers.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const customersRoutes = new Elysia({ prefix: '/customers' })
    .use(withRequestLogger())
    .get('/', customersController.getCustomersController, {
        beforeHandle: authMiddleware,
        ...customersSchemas.getCustomersQuerySchema,
    })
    .get('/:id', customersController.getCustomerByIdController, {
        beforeHandle: authMiddleware,
        ...customersSchemas.customerIdParamSchema,
    })
    .post('/', customersController.createCustomerController, {
        beforeHandle: authMiddleware,
        ...customersSchemas.createCustomerBodySchema,
    })
    .put('/:id', customersController.updateCustomerController, {
        beforeHandle: authMiddleware,
        ...customersSchemas.updateCustomerBodySchema,
    })
    .delete('/:id', customersController.deleteCustomerController, {
        beforeHandle: authMiddleware,
        ...customersSchemas.customerIdParamSchema,
    });
