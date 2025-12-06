/**
 * Pricing routes
 */

import { Elysia } from 'elysia';
import * as pricingController from './pricing.controller.js';
import * as pricingSchemas from './pricing.schemas.js';
import { authMiddleware } from '../../libs/auth.js';
import { withRequestLogger } from '../../libs/requestLogger.js';

export const pricingRoutes = new Elysia({ prefix: '/pricing' })
    .use(withRequestLogger())
    .get('/quote', pricingController.getPriceQuoteController, {
        beforeHandle: authMiddleware,
        ...pricingSchemas.getPriceQuoteQuerySchema,
    })
    .get('/tiers', pricingController.getPriceTiersController, {
        beforeHandle: authMiddleware,
        ...pricingSchemas.getPriceTiersQuerySchema,
    })
    .post('/tiers', pricingController.createPriceTierController, {
        beforeHandle: authMiddleware,
        ...pricingSchemas.createPriceTierBodySchema,
    })
    .put('/tiers/:id', pricingController.updatePriceTierController, {
        beforeHandle: authMiddleware,
        ...pricingSchemas.updatePriceTierBodySchema,
    })
    .get('/products/:productId/prices', pricingController.getProductPricesController, {
        beforeHandle: authMiddleware,
        ...pricingSchemas.productIdParamSchema,
    })
    .post('/products/:productId/prices', pricingController.setProductPriceController, {
        beforeHandle: authMiddleware,
        ...pricingSchemas.setProductPriceBodySchema,
    });
