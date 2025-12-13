/**
 * Products service with Redis caching
 * Cache strategy: Product data is cached WITHOUT inventory.
 * Inventory is always fetched fresh and merged with cached product data.
 */

import prisma from "../../libs/prisma.js";
import {
  normalizePagination,
  buildPaginationMeta,
} from "../../libs/pagination.js";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  hashObject,
  CACHE_KEYS,
  CACHE_TTL,
} from "../../libs/cache.js";

/**
 * Fetch inventory for a product by ID (always fresh)
 */
async function fetchInventoryForProduct(productId) {
  return prisma.inventory.findMany({
    where: { productId },
    include: {
      warehouse: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Fetch inventory for products by outlet ID
 */
async function fetchInventoryByOutlet(outletId, productIds) {
  const inventories = await prisma.inventory.findMany({
    where: {
      productId: { in: productIds },
      warehouse: { outletId },
    },
    include: { warehouse: true },
  });

  // Group by productId
  const inventoryMap = new Map();
  for (const inv of inventories) {
    if (!inventoryMap.has(inv.productId)) {
      inventoryMap.set(inv.productId, []);
    }
    inventoryMap.get(inv.productId).push(inv);
  }
  return inventoryMap;
}

export async function getProducts(filters = {}) {
  const { search, category, isActive, page, limit, outletId, businessId } =
    filters;

  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Normalize pagination with max limit enforcement
  const {
    page: pageNum,
    limit: limitNum,
    skip,
  } = normalizePagination({ page, limit });

  // Create cache key from filters (excluding outletId since inventory is separate)
  const cacheFilters = {
    businessId,
    search,
    category,
    isActive,
    page: pageNum,
    limit: limitNum,
  };
  const cacheKey = CACHE_KEYS.PRODUCTS_LIST(hashObject(cacheFilters));

  const where = { businessId };

  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (isActive !== undefined) {
    // Convert string "true"/"false" to boolean
    where.isActive = isActive === "true" || isActive === true;
  }

  // Try to get from cache first
  const cached = await getCache(cacheKey);

  if (cached) {
    // Cache hit: if outletId requested, fetch fresh inventory in parallel
    if (outletId && cached.products.length > 0) {
      const productIds = cached.products.map((p) => p.id);
      const inventoryMap = await fetchInventoryByOutlet(outletId, productIds);

      // Merge fresh inventory with cached products
      const productsWithInventory = cached.products.map((product) => ({
        ...product,
        inventories: inventoryMap.get(product.id) || [],
      }));

      return {
        products: productsWithInventory,
        pagination: cached.pagination,
      };
    }

    // No inventory needed, return cached directly
    return cached;
  }

  // Cache miss: fetch from database
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      // Don't include inventories in DB query for caching
    }),
    prisma.product.count({ where }),
  ]);

  const result = {
    products,
    pagination: buildPaginationMeta(total, pageNum, limitNum),
  };

  // Cache the result (without inventory)
  await setCache(cacheKey, result, CACHE_TTL.PRODUCT_LIST);

  // If outletId is requested, fetch and merge inventory
  if (outletId && products.length > 0) {
    const productIds = products.map((p) => p.id);
    const inventoryMap = await fetchInventoryByOutlet(outletId, productIds);

    const productsWithInventory = products.map((product) => ({
      ...product,
      inventories: inventoryMap.get(product.id) || [],
    }));

    return {
      products: productsWithInventory,
      pagination: result.pagination,
    };
  }

  return result;
}

export async function getProductById(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const cacheKey = CACHE_KEYS.PRODUCT_BY_ID(id);

  // Parallel fetch: cache + fresh inventory
  const [cached, inventories] = await Promise.all([
    getCache(cacheKey),
    fetchInventoryForProduct(id),
  ]);

  if (cached) {
    // Validate business access
    if (cached.businessId !== businessId) {
      throw new Error("Product not found");
    }
    // Cache hit: merge with fresh inventory
    return { ...cached, inventories };
  }

  // Cache miss: fetch full product from DB (without inventories)
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      priceTiers: {
        include: {
          priceTier: true,
          outlet: true,
        },
      },
    },
  });

  if (!product || product.businessId !== businessId) {
    throw new Error("Product not found");
  }

  // Cache product data (without inventories)
  await setCache(cacheKey, product, CACHE_TTL.PRODUCT_DETAIL);

  // Return product with fresh inventory
  return { ...product, inventories };
}

export async function createProduct(data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      businessId,
    },
  });

  // Invalidate product list cache
  await deleteCachePattern("cache:products:list:*");

  return product;
}

export async function updateProduct(id, data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify product belongs to business
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    throw new Error("Product not found");
  }

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  // Invalidate caches
  await Promise.all([
    deleteCache(CACHE_KEYS.PRODUCT_BY_ID(id)),
    deleteCachePattern("cache:products:list:*"),
  ]);

  return product;
}

export async function deleteProduct(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify product belongs to business
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    throw new Error("Product not found");
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  // Invalidate caches
  await Promise.all([
    deleteCache(CACHE_KEYS.PRODUCT_BY_ID(id)),
    deleteCachePattern("cache:products:list:*"),
  ]);

  return { message: "Product deactivated successfully" };
}
