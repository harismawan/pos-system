/**
 * Pricing service
 * Handles price tier resolution and product pricing
 */

import prisma from "../../libs/prisma.js";
import logger from "../../libs/logger.js";

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
/**
 * Resolve effective price for a product
 * Priority: customer tier > outlet default tier > global default tier
 * Then: outlet-specific price > global tier price > base price
 *
 * @param {string} productId - Product ID
 * @param {string} outletId - Outlet ID
 * @param {string|null} customerId - Customer ID (optional)
 * @param {string} businessId - Business ID (required)
 * @returns {Object} Effective price and tier info
 */
export async function resolvePrice(
  productId,
  outletId,
  customerId = null,
  businessId,
) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Fetch product
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.businessId !== businessId) {
    if (!product) throw new Error("Product not found");
    // If product belongs to another business, treat as not found for security
    throw new Error("Product not found");
  }

  // Step 1: Determine effective price tier
  let effectivePriceTier = null;
  let tierSource = "base";

  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { priceTier: true },
    });

    if (customer && customer.businessId === businessId && customer.priceTier) {
      effectivePriceTier = customer.priceTier;
      tierSource = "customer";
    }
  }

  if (!effectivePriceTier && outletId) {
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: { defaultPriceTier: true },
    });

    if (outlet && outlet.businessId === businessId && outlet.defaultPriceTier) {
      effectivePriceTier = outlet.defaultPriceTier;
      tierSource = "outlet";
    }
  }

  if (!effectivePriceTier) {
    effectivePriceTier = await prisma.priceTier.findFirst({
      where: { isDefault: true, businessId },
    });
    // Only set as default source if a default tier was actually found
    if (effectivePriceTier) {
      tierSource = "default";
    }
  }

  // Step 2: Query ProductPriceTier for resolved price
  let effectivePrice = product.basePrice;
  let priceSource = "base_price";

  if (effectivePriceTier) {
    // Try outlet-specific price first
    if (outletId) {
      const outletSpecificPrice = await prisma.productPriceTier.findFirst({
        where: {
          productId,
          priceTierId: effectivePriceTier.id,
          outletId,
        },
      });

      if (outletSpecificPrice) {
        effectivePrice = outletSpecificPrice.price;
        priceSource = "outlet_tier_price";
      }
    }

    if (priceSource === "base_price") {
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
        priceSource = "global_tier_price";
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
    priceTier: effectivePriceTier
      ? {
          id: effectivePriceTier.id,
          name: effectivePriceTier.name,
          code: effectivePriceTier.code,
        }
      : null,
    tierSource,
    priceSource,
  };
}

/**
 * Get price quote for multiple products
 */
/**
 * Get price quote for multiple products
 */
export async function getPriceQuote(
  items,
  outletId,
  customerId = null,
  businessId,
) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }
  const quotes = await Promise.all(
    items.map((item) =>
      resolvePrice(item.productId, outletId, customerId, businessId),
    ),
  );

  return quotes;
}

/**
 * Get price tiers
 */
export async function getPriceTiers(businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  return prisma.priceTier.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
}

/**
 * Create price tier
 */
export async function createPriceTier(data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // If this is set as default, unset other defaults within the  business
  if (data.isDefault) {
    await prisma.priceTier.updateMany({
      where: { businessId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.priceTier.create({
    data: {
      ...data,
      businessId,
    },
  });
}

/**
 * Update price tier
 */
export async function updatePriceTier(id, data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify price tier belongs to business
  const existing = await prisma.priceTier.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    throw new Error("Price tier not found");
  }

  if (data.isDefault) {
    await prisma.priceTier.updateMany({
      where: { businessId, isDefault: true, id: { not: id } },
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
/**
 * Get product prices by product ID
 */
export async function getProductPrices(productId, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.businessId !== businessId) {
    throw new Error("Product not found");
  }

  return prisma.productPriceTier.findMany({
    where: { productId },
    include: {
      priceTier: true,
      outlet: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Set product price for a tier
 */
/**
 * Set product price for a tier
 */
export async function setProductPrice(data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const { productId, priceTierId, outletId, price } = data;

  // Validate product
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.businessId !== businessId) {
    throw new Error("Product not found");
  }

  // Validate price tier
  const priceTier = await prisma.priceTier.findUnique({
    where: { id: priceTierId },
  });
  if (!priceTier || priceTier.businessId !== businessId) {
    throw new Error("Price tier not found");
  }

  // Validate outlet if provided
  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
  }

  // Ensure unique constraint via database logic, but here we just upsert
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
