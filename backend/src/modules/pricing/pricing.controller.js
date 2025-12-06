/**
 * Pricing controller
 */

import * as pricingService from './pricing.service.js';
import logger from '../../libs/logger.js';

export async function getPriceQuoteController({ query, request, set }) {
    try {
        const { productId, customerId } = query;
        const outletId = store.outletId || query.outletId;

        if (!productId || !outletId) {
            set.status = 400;
            return {
                success: false,
                error: 'productId and outletId are required',
            };
        }

        const quote = await pricingService.resolvePrice(productId, outletId, customerId);

        return {
            success: true,
            data: quote,
        };
    } catch (err) {
        logger.error({ err }, 'Get price quote failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to get price quote',
        };
    }
}

export async function getPriceTiersController({ set }) {
    try {
        const tiers = await pricingService.getPriceTiers();

        return {
            success: true,
            data: tiers,
        };
    } catch (err) {
        logger.error({ err }, 'Get price tiers failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to get price tiers',
        };
    }
}

export async function createPriceTierController({ body, set }) {
    try {
        const tier = await pricingService.createPriceTier(body);

        set.status = 201;
        return {
            success: true,
            data: tier,
        };
    } catch (err) {
        logger.error({ err }, 'Create price tier failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to create price tier',
        };
    }
}

export async function updatePriceTierController({ params, body, set }) {
    try {
        const tier = await pricingService.updatePriceTier(params.id, body);

        return {
            success: true,
            data: tier,
        };
    } catch (err) {
        logger.error({ err }, 'Update price tier failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to update price tier',
        };
    }
}

export async function getProductPricesController({ params, set }) {
    try {
        const prices = await pricingService.getProductPrices(params.productId);

        return {
            success: true,
            data: prices,
        };
    } catch (err) {
        logger.error({ err }, 'Get product prices failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to get product prices',
        };
    }
}

export async function setProductPriceController({ params, body, set }) {
    try {
        const price = await pricingService.setProductPrice({
            productId: params.productId,
            ...body,
        });

        return {
            success: true,
            data: price,
        };
    } catch (err) {
        logger.error({ err }, 'Set product price failed');
        set.status = 400;
        return {
            success: false,
            error: err.message || 'Failed to set product price',
        };
    }
}
