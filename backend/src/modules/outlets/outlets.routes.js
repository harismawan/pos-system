/**
 * Outlets routes
 */

import { Elysia } from 'elysia';
import * as outletsController from './outlets.controller.js';
import * as outletsSchemas from './outlets.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { requirePermission, PERMISSIONS } from '../../libs/permissions.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const outletsRoutes = new Elysia({ prefix: '/outlets' })
    .use(withRequestLogger())
    .get('/', outletsController.getOutletsController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.SETTINGS_OUTLETS)],
        ...outletsSchemas.getOutletsQuerySchema,
    })
    .get('/:id', outletsController.getOutletByIdController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.SETTINGS_OUTLETS)],
        ...outletsSchemas.outletIdParamSchema,
    })
    .post('/', outletsController.createOutletController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.SETTINGS_OUTLETS)],
        ...outletsSchemas.createOutletBodySchema,
    })
    .put('/:id', outletsController.updateOutletController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.SETTINGS_OUTLETS)],
        ...outletsSchemas.updateOutletBodySchema,
    })
    .delete('/:id', outletsController.deleteOutletController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.SETTINGS_OUTLETS)],
        ...outletsSchemas.outletIdParamSchema,
    })
    .get('/:id/users', outletsController.getOutletUsersController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_VIEW)],
        ...outletsSchemas.outletIdParamSchema,
    })
    .post('/:id/users', outletsController.assignUserToOutletController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_EDIT)],
        ...outletsSchemas.assignUserBodySchema,
    })
    .delete('/:id/users/:userId', outletsController.removeUserFromOutletController, {
        beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_EDIT)],
        ...outletsSchemas.removeUserParamsSchema,
    });
