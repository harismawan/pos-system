/**
 * Reports service
 * Handles business logic for generating reports
 * All report functions are cached using Redis
 */

import prisma from "../../libs/prisma.js";
import {
  wrapWithCache,
  hashObject,
  CACHE_KEYS,
  CACHE_TTL,
} from "../../libs/cache.js";

/**
 * Get top selling products (cached)
 */
/**
 * Get top selling products (cached)
 */
export async function getTopProducts(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const cacheKey = CACHE_KEYS.REPORT_TOP_PRODUCTS(
    hashObject({ ...filters, businessId }),
  );

  return wrapWithCache(cacheKey, CACHE_TTL.REPORT_TOP_PRODUCTS, async () => {
    return fetchTopProducts(filters, businessId);
  });
}

/**
 * Internal: Fetch top products from DB
 */
/**
 * Internal: Fetch top products from DB
 */
async function fetchTopProducts(filters = {}, businessId) {
  const {
    startDate,
    endDate,
    outletId,
    limit = 10,
    sortBy = "revenue",
  } = filters;

  const where = {
    posOrder: {
      status: "COMPLETED",
      outlet: {
        businessId, // Filter by business
      },
    },
  };

  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
    where.posOrder.outletId = outletId;
  }

  if (startDate || endDate) {
    where.posOrder.createdAt = {};
    if (startDate) where.posOrder.createdAt.gte = new Date(startDate);
    if (endDate) where.posOrder.createdAt.lte = new Date(endDate);
  }

  const orderItems = await prisma.posOrderItem.findMany({
    where,
    select: {
      productId: true,
      quantity: true,
      lineTotal: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
        },
      },
    },
  });

  // Aggregate by product
  const productMap = {};
  orderItems.forEach((item) => {
    if (!productMap[item.productId]) {
      productMap[item.productId] = {
        product: item.product,
        totalQuantity: 0,
        totalRevenue: 0,
        orderCount: 0,
      };
    }
    productMap[item.productId].totalQuantity += parseFloat(item.quantity);
    productMap[item.productId].totalRevenue += parseFloat(item.lineTotal);
    productMap[item.productId].orderCount += 1;
  });

  // Sort and limit
  const products = Object.values(productMap)
    .sort((a, b) =>
      sortBy === "revenue"
        ? b.totalRevenue - a.totalRevenue
        : b.totalQuantity - a.totalQuantity,
    )
    .slice(0, limit);

  return { products };
}

/**
 * Get inventory valuation report (cached)
 */
/**
 * Get inventory valuation report (cached)
 */
export async function getInventoryValuation(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const cacheKey = CACHE_KEYS.REPORT_INVENTORY(
    hashObject({ ...filters, businessId }),
  );

  return wrapWithCache(cacheKey, CACHE_TTL.REPORT_SUMMARY, async () => {
    return fetchInventoryValuation(filters, businessId);
  });
}

/**
 * Internal: Fetch inventory valuation from DB
 */
/**
 * Internal: Fetch inventory valuation from DB
 */
async function fetchInventoryValuation(filters = {}, businessId) {
  const { warehouseId, category } = filters;

  const where = {
    product: {
      businessId, // Filter by business
    },
  };
  if (warehouseId) where.warehouseId = warehouseId;

  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          costPrice: true,
          basePrice: true,
        },
      },
      warehouse: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  // Filter by category if specified
  let filteredInventory = inventory;
  if (category) {
    filteredInventory = inventory.filter(
      (i) => i.product.category === category,
    );
  }

  // Calculate values
  const items = filteredInventory.map((item) => {
    const quantity = parseFloat(item.quantityOnHand);
    const costPrice = parseFloat(item.product.costPrice || 0);
    const retailPrice = parseFloat(item.product.basePrice);

    return {
      product: item.product,
      warehouse: item.warehouse,
      quantity,
      costValue: quantity * costPrice,
      retailValue: quantity * retailPrice,
      minimumStock: parseFloat(item.minimumStock),
      isLowStock: quantity <= parseFloat(item.minimumStock),
    };
  });

  const totalCostValue = items.reduce((sum, i) => sum + i.costValue, 0);
  const totalRetailValue = items.reduce((sum, i) => sum + i.retailValue, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const lowStockCount = items.filter((i) => i.isLowStock).length;

  return {
    summary: {
      totalCostValue,
      totalRetailValue,
      totalItems,
      productCount: items.length,
      lowStockCount,
    },
    items,
  };
}

/**
 * Get stock movement report (cached)
 */
/**
 * Get stock movement report (cached)
 */
export async function getStockMovementReport(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const cacheKey = CACHE_KEYS.REPORT_STOCK_MOVEMENTS(
    hashObject({ ...filters, businessId }),
  );

  return wrapWithCache(cacheKey, CACHE_TTL.REPORT_SUMMARY, async () => {
    return fetchStockMovementReport(filters, businessId);
  });
}

/**
 * Internal: Fetch stock movement report from DB
 */
/**
 * Internal: Fetch stock movement report from DB
 */
async function fetchStockMovementReport(filters = {}, businessId) {
  const {
    startDate,
    endDate,
    outletId,
    warehouseId,
    type,
    page = 1,
    limit = 50,
  } = filters;

  const where = {
    product: {
      businessId, // Filter by business via product
    },
  };

  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
    where.outletId = outletId;
  }

  if (warehouseId) {
    where.OR = [
      { fromWarehouseId: warehouseId },
      { toWarehouseId: warehouseId },
    ];
  }
  if (type) where.type = type;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        fromWarehouse: {
          select: { id: true, name: true, code: true },
        },
        toWarehouse: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  // Summary by type
  const typeSummary = await prisma.stockMovement.groupBy({
    by: ["type"],
    where,
    _sum: {
      quantity: true,
    },
    _count: true,
  });

  return {
    movements,
    summary: typeSummary.map((t) => ({
      type: t.type,
      count: t._count,
      totalQuantity: parseFloat(t._sum.quantity || 0),
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get order history
 */
/**
 * Get order history
 */
export async function getOrderHistory(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const {
    startDate,
    endDate,
    outletId,
    status,
    customerId,
    page = 1,
    limit = 20,
  } = filters;

  const where = {
    outlet: {
      businessId, // Filter by business
    },
  };

  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
    where.outletId = outletId;
  }

  if (status) where.status = status;

  if (customerId) {
    // Verify customer belongs to business
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer || customer.businessId !== businessId) {
      throw new Error("Customer not found");
    }
    where.customerId = customerId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.posOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        cashier: {
          select: { id: true, name: true },
        },
        outlet: {
          select: { id: true, name: true, code: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.posOrder.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get sales trend with period comparison (cached)
 * Compares current period with previous period (e.g., this week vs last week)
 */
/**
 * Get sales trend with period comparison (cached)
 * Compares current period with previous period (e.g., this week vs last week)
 */
export async function getSalesTrend(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const cacheKey = CACHE_KEYS.REPORT_SALES_TREND(
    hashObject({ ...filters, businessId }),
  );

  return wrapWithCache(cacheKey, CACHE_TTL.REPORT_TREND, async () => {
    return fetchSalesTrend(filters, businessId);
  });
}

/**
 * Internal: Fetch sales trend with comparison from DB
 */
/**
 * Internal: Fetch sales trend with comparison from DB
 */
async function fetchSalesTrend(filters = {}, businessId) {
  const {
    startDate,
    endDate,
    outletId,
    compareWithPrevious = true,
    groupBy = "day",
  } = filters;

  // Set proper time boundaries for current period
  const currentStart = new Date(startDate);
  currentStart.setHours(0, 0, 0, 0);

  const currentEnd = new Date(endDate);
  currentEnd.setHours(23, 59, 59, 999);

  const periodDays = Math.ceil(
    (currentEnd - currentStart) / (1000 * 60 * 60 * 24),
  );

  // Build where clause for current period
  const currentWhere = {
    status: "COMPLETED",
    outlet: {
      businessId,
    },
    createdAt: {
      gte: currentStart,
      lte: currentEnd,
    },
  };

  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
    currentWhere.outletId = outletId;
  }

  // Fetch current period orders with additional fields for tax/discount
  const currentOrders = await prisma.posOrder.findMany({
    where: currentWhere,
    select: {
      totalAmount: true,
      totalDiscountAmount: true,
      totalTaxAmount: true,
      createdAt: true,
      items: {
        select: { quantity: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group current data by date with groupBy support
  const currentData = groupOrdersByDate(currentOrders, groupBy);

  // Calculate current period totals (includes tax/discount)
  const currentTotals = calculatePeriodTotals(currentOrders);

  let previousData = [];
  let previousTotals = null;
  let comparison = null;

  // Fetch previous period if requested
  if (compareWithPrevious) {
    // Previous period should be the same duration, immediately before current period
    // e.g., if current is Jan 15-21 (7 days), previous should be Jan 8-14 (7 days)
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1); // Day before current start
    previousEnd.setHours(23, 59, 59, 999);

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - periodDays + 1); // Same duration
    previousStart.setHours(0, 0, 0, 0);

    const previousWhere = {
      status: "COMPLETED",
      outlet: {
        businessId,
      },
      createdAt: {
        gte: previousStart,
        lte: previousEnd,
      },
    };
    if (outletId) previousWhere.outletId = outletId;

    const previousOrders = await prisma.posOrder.findMany({
      where: previousWhere,
      select: {
        totalAmount: true,
        createdAt: true,
        items: {
          select: { quantity: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    previousData = groupOrdersByDate(previousOrders);
    previousTotals = calculatePeriodTotals(previousOrders);

    // Calculate comparison percentages
    comparison = {
      revenueChange: calculatePercentChange(
        previousTotals.revenue,
        currentTotals.revenue,
      ),
      ordersChange: calculatePercentChange(
        previousTotals.orders,
        currentTotals.orders,
      ),
      itemsChange: calculatePercentChange(
        previousTotals.items,
        currentTotals.items,
      ),
      avgOrderValueChange: calculatePercentChange(
        previousTotals.avgOrderValue,
        currentTotals.avgOrderValue,
      ),
    };
  }

  return {
    current: {
      data: currentData,
      totals: currentTotals,
    },
    previous: compareWithPrevious
      ? {
          data: previousData,
          totals: previousTotals,
        }
      : null,
    comparison,
  };
}

/**
 * Get hourly sales heatmap (cached)
 * Returns sales data grouped by hour and day of week
 */
/**
 * Get hourly sales heatmap (cached)
 * Returns sales data grouped by hour and day of week
 */
export async function getHourlySalesHeatmap(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const cacheKey = CACHE_KEYS.REPORT_HEATMAP(
    hashObject({ ...filters, businessId }),
  );

  return wrapWithCache(cacheKey, CACHE_TTL.REPORT_HEATMAP, async () => {
    return fetchHourlySalesHeatmap(filters, businessId);
  });
}

/**
 * Internal: Fetch hourly sales heatmap from DB
 */
/**
 * Internal: Fetch hourly sales heatmap from DB
 */
async function fetchHourlySalesHeatmap(filters = {}, businessId) {
  const { startDate, endDate, outletId } = filters;

  const where = {
    status: "COMPLETED",
    outlet: {
      businessId,
    },
  };
  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
    where.outletId = outletId;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.posOrder.findMany({
    where,
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  // Initialize heatmap grid (7 days x 24 hours)
  // Days: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const heatmap = Array(7)
    .fill(null)
    .map(() =>
      Array(24)
        .fill(null)
        .map(() => ({ orders: 0, revenue: 0 })),
    );

  // Aggregate data
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    heatmap[dayOfWeek][hour].orders += 1;
    heatmap[dayOfWeek][hour].revenue += parseFloat(order.totalAmount);
  });

  // Find peak hours
  let maxOrders = 0;
  let peakHour = { day: 0, hour: 0 };

  heatmap.forEach((day, dayIndex) => {
    day.forEach((slot, hourIndex) => {
      if (slot.orders > maxOrders) {
        maxOrders = slot.orders;
        peakHour = { day: dayIndex, hour: hourIndex };
      }
    });
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    heatmap,
    dayNames,
    peakHour: {
      day: dayNames[peakHour.day],
      hour: peakHour.hour,
      orders: maxOrders,
    },
    totalOrders: orders.length,
  };
}

// Helper functions for analytics

function groupOrdersByDate(orders, groupBy = "day") {
  const grouped = {};
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    let key;

    if (groupBy === "day") {
      key = date.toISOString().split("T")[0];
    } else if (groupBy === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else if (groupBy === "month") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else {
      key = date.toISOString().split("T")[0];
    }

    if (!grouped[key]) {
      grouped[key] = { date: key, revenue: 0, orders: 0, items: 0 };
    }
    grouped[key].revenue += parseFloat(order.totalAmount);
    grouped[key].orders += 1;
    grouped[key].items += order.items.reduce(
      (sum, item) => sum + parseFloat(item.quantity),
      0,
    );
  });
  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

function calculatePeriodTotals(orders) {
  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
  const orderCount = orders.length;
  const items = orders.reduce(
    (sum, o) =>
      sum +
      o.items.reduce((itemSum, item) => itemSum + parseFloat(item.quantity), 0),
    0,
  );
  const totalTax = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalTaxAmount || 0),
    0,
  );
  const totalDiscount = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalDiscountAmount || 0),
    0,
  );

  return {
    revenue,
    orders: orderCount,
    items,
    avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
    totalTax,
    totalDiscount,
    netRevenue: revenue - totalDiscount,
    avgItemsPerOrder: orderCount > 0 ? items / orderCount : 0,
  };
}

function calculatePercentChange(previous, current) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
