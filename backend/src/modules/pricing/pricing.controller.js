/**
 * Pricing controller
 */

import * as pricingService from './pricing.service.js';
import logger from '../../libs/logger.js';
import { PRC } from '../../libs/responseCodes.js';
import { successResponse, errorResponse } from '../../libs/responses.js';

export async function getPriceQuoteController({ query, store, set }) {
    try {
        const { productId, customerId } = query;
        const outletId = store.outletId || query.outletId;

        if (!productId || !outletId) {
            set.status = 400;
            return errorResponse(PRC.MISSING_PARAMS, 'productId and outletId are required');
        }

        const quote = await pricingService.resolvePrice(productId, outletId, customerId);

        return successResponse(PRC.QUOTE_SUCCESS, quote);
    } catch (err) {
        logger.error({ err }, 'Get price quote failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(PRC.QUOTE_FAILED, message);
    }
}

export async function getPriceTiersController({ set }) {
    try {
        const tiers = await pricingService.getPriceTiers();

        return successResponse(PRC.LIST_TIERS_SUCCESS, tiers);
    } catch (err) {
        logger.error({ err }, 'Get price tiers failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(PRC.LIST_TIERS_FAILED, message);
    }
}

export async function createPriceTierController({ body, set }) {
    try {
        const tier = await pricingService.createPriceTier(body);

        set.status = 201;
        return successResponse(PRC.CREATE_TIER_SUCCESS, tier);
    } catch (err) {
        logger.error({ err }, 'Create price tier failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(PRC.CREATE_TIER_FAILED, message);
    }
}

export async function updatePriceTierController({ params, body, set }) {
    try {
        const tier = await pricingService.updatePriceTier(params.id, body);

        return successResponse(PRC.UPDATE_TIER_SUCCESS, tier);
    } catch (err) {
        logger.error({ err }, 'Update price tier failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(PRC.UPDATE_TIER_FAILED, message);
    }
}

export async function getProductPricesController({ params, set }) {
    try {
        const prices = await pricingService.getProductPrices(params.productId);

        return successResponse(PRC.GET_PRICES_SUCCESS, prices);
    } catch (err) {
        logger.error({ err }, 'Get product prices failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(PRC.GET_PRICES_FAILED, message);
    }
}

export async function setProductPriceController({ params, body, set }) {
    try {
        const price = await pricingService.setProductPrice({
            productId: params.productId,
            ...body,
        });

        return successResponse(PRC.SET_PRICE_SUCCESS, price);
    } catch (err) {
        logger.error({ err }, 'Set product price failed');
        set.status = err.statusCode || 500;
        const message = set.status === 500 ? 'Internal Server Error' : err.message;
        return errorResponse(PRC.SET_PRICE_FAILED, message);
    }
}
