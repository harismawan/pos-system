/**
 * Pricing service
 * Handles price tier resolution and product pricing
 */

import prisma from '../../libs/prisma.js';
import logger from '../../libs/logger.js';

/**
 * Resolve effective price for a product
 * Priority: customer tier > outlet default tier > global default tier
 * Then: outlet-specific price > global tier price > base price
 * 
 * @param {string} productId - Product ID
 * @param {string} outletId - Outlet ID
 * @param {string|null} customerId - Customer ID (optional)
 * @returns {Object} Effective price and tier info
 */
export async function resolvePrice(productId, outletId, customerId = null) {
    // Fetch product
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });

    if (!product) {
        throw new Error('Product not found');
    }

    // Step 1: Determine effective price tier
    let effectivePriceTier = null;
    let tierSource = 'base';

    if (customerId) {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: { priceTier: true },
        });

        if (customer?.priceTier) {
            effectivePriceTier = customer.priceTier;
            tierSource = 'customer';
        }
    }

    if (!effectivePriceTier && outletId) {
        const outlet = await prisma.outlet.findUnique({
            where: { id: outletId },
            include: { defaultPriceTier: true },
        });

        if (outlet?.defaultPriceTier) {
            effectivePriceTier = outlet.defaultPriceTier;
            tierSource = 'outlet';
        }
    }

    if (!effectivePriceTier) {
        effectivePriceTier = await prisma.priceTier.findFirst({
            where: { isDefault: true },
        });
        tierSource = 'default';
    }

    // Step 2: Query ProductPriceTier for resolved price
    let effectivePrice = product.basePrice;
    let priceSource = 'base_price';

    if (effectivePriceTier) {
        // Try outlet-specific price first
        const outletSpecificPrice = await prisma.productPriceTier.findFirst({
            where: {
                productId,
                priceTierId: effectivePriceTier.id,
                outletId,
            },
        });

        if (outletSpecificPrice) {
            effectivePrice = outletSpecificPrice.price;
            priceSource = 'outlet_tier_price';
        } else {
            // Try global tier price
            const globalTierPrice = await prisma.productPriceTier.findFirst({
                where: {
                    productId,
                    priceTierId: effectivePriceTier.id,
                    outletId: null,
                },
            });

            if (globalTierPrice) {
                effectivePrice = globalTierPrice.price;
                priceSource = 'global_tier_price';
            }
        }
    }

    return {
        productId,
        productName: product.name,
        effectivePrice: parseFloat(effectivePrice),
        basePrice: parseFloat(product.basePrice),
        costPrice: product.costPrice ? parseFloat(product.costPrice) : null,
        taxRate: product.taxRate ? parseFloat(product.taxRate) : null,
        priceTier: effectivePriceTier ? {
            id: effectivePriceTier.id,
            name: effectivePriceTier.name,
            code: effectivePriceTier.code,
        } : null,
        tierSource,
        priceSource,
    };
}

/**
 * Get price quote for multiple products
 */
export async function getPriceQuote(items, outletId, customerId = null) {
    const quotes = await Promise.all(
        items.map(item => resolvePrice(item.productId, outletId, customerId))
    );

    return quotes;
}

/**
 * Get price tiers
 */
export async function getPriceTiers() {
    return prisma.priceTier.findMany({
        orderBy: { name: 'asc' },
    });
}

/**
 * Create price tier
 */
export async function createPriceTier(data) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
        await prisma.priceTier.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
        });
    }

    return prisma.priceTier.create({
        data,
    });
}

/**
 * Update price tier
 */
export async function updatePriceTier(id, data) {
    if (data.isDefault) {
        await prisma.priceTier.updateMany({
            where: { isDefault: true, id: { not: id } },
            data: { isDefault: false },
        });
    }

    return prisma.priceTier.update({
        where: { id },
        data,
    });
}

/**
 * Get product prices by product ID
 */
export async function getProductPrices(productId) {
    return prisma.productPriceTier.findMany({
        where: { productId },
        include: {
            priceTier: true,
            outlet: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Set product price for a tier
 */
export async function setProductPrice(data) {
    const { productId, priceTierId, outletId, price } = data;

    return prisma.productPriceTier.upsert({
        where: {
            productId_priceTierId_outletId: {
                productId,
                priceTierId,
                outletId: outletId || null,
            },
        },
        update: { price },
        create: {
            productId,
            priceTierId,
            outletId: outletId || null,
            price,
        },
    });
}
