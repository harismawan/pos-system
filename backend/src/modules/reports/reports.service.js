/**
 * Reports service
 * Handles business logic for generating reports
 */

import prisma from "../../libs/prisma.js";

/**
 * Get sales summary report
 */
export async function getSalesSummary(filters = {}) {
  const { startDate, endDate, outletId, groupBy = "day" } = filters;

  const where = {
    status: "COMPLETED",
  };

  if (outletId) where.outletId = outletId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Get all completed orders
  const orders = await prisma.posOrder.findMany({
    where,
    select: {
      id: true,
      totalAmount: true,
      totalDiscountAmount: true,
      totalTaxAmount: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Calculate totals
  const totalRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalAmount),
    0,
  );
  const totalOrders = orders.length;
  const totalItems = orders.reduce(
    (sum, o) =>
      sum +
      o.items.reduce((itemSum, item) => itemSum + parseFloat(item.quantity), 0),
    0,
  );
  const totalDiscount = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalDiscountAmount),
    0,
  );
  const totalTax = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalTaxAmount),
    0,
  );
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Group by period
  const groupedData = {};
  orders.forEach((order) => {
    let key;
    const date = new Date(order.createdAt);

    if (groupBy === "day") {
      key = date.toISOString().split("T")[0];
    } else if (groupBy === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else if (groupBy === "month") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!groupedData[key]) {
      groupedData[key] = { date: key, revenue: 0, orders: 0, items: 0 };
    }
    groupedData[key].revenue += parseFloat(order.totalAmount);
    groupedData[key].orders += 1;
    groupedData[key].items += order.items.reduce(
      (sum, item) => sum + parseFloat(item.quantity),
      0,
    );
  });

  return {
    summary: {
      totalRevenue,
      totalOrders,
      totalItems,
      totalDiscount,
      totalTax,
      averageOrderValue,
    },
    chartData: Object.values(groupedData),
  };
}

/**
 * Get top selling products
 */
export async function getTopProducts(filters = {}) {
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
    },
  };

  if (outletId) where.posOrder.outletId = outletId;
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
 * Get inventory valuation report
 */
export async function getInventoryValuation(filters = {}) {
  const { warehouseId, category } = filters;

  const where = {};
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
 * Get stock movement report
 */
export async function getStockMovementReport(filters = {}) {
  const {
    startDate,
    endDate,
    outletId,
    warehouseId,
    type,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  if (outletId) where.outletId = outletId;
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
export async function getOrderHistory(filters = {}) {
  const {
    startDate,
    endDate,
    outletId,
    status,
    customerId,
    page = 1,
    limit = 20,
  } = filters;

  const where = {};

  if (outletId) where.outletId = outletId;
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
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
