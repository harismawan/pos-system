/**
 * Report generation job handler
 */

import prisma from "../libs/prisma.js";
import logger from "../libs/logger.js";

export async function handleReportGenerationJob(payload) {
  const { reportType, params, notifyEmail } = payload;

  try {
    let reportData;

    if (reportType === "sales_summary") {
      reportData = await generateSalesSummaryReport(params);
    } else if (reportType === "stock_summary") {
      reportData = await generateStockSummaryReport(params);
    } else {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    logger.info({ reportType, params }, "Report generated");

    // In production, you might store this in a GeneratedReport table
    // For now, just log it
    logger.debug({ reportData }, "Report data");

    // TODO: If notifyEmail is provided, enqueue email notification

    return reportData;
  } catch (err) {
    logger.error({ err, payload }, "Failed to generate report");
    throw err;
  }
}

async function generateSalesSummaryReport({ from, to, outletId }) {
  const where = {
    status: "COMPLETED",
    createdAt: {
      gte: new Date(from),
      lte: new Date(to),
    },
  };

  if (outletId) {
    where.outletId = outletId;
  }

  const orders = await prisma.posOrder.findMany({
    where,
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const totalRevenue = orders.reduce(
    (sum, order) => sum + parseFloat(order.totalAmount),
    0,
  );

  const totalOrders = orders.length;

  const topProducts = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.product.id;
      if (!topProducts[key]) {
        topProducts[key] = {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
      }
      topProducts[key].quantity += parseFloat(item.quantity);
      topProducts[key].revenue += parseFloat(item.lineTotal);
    });
  });

  return {
    from,
    to,
    outletId,
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    topProducts: Object.values(topProducts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  };
}

async function generateStockSummaryReport({ outletId }) {
  const where = {};

  if (outletId) {
    where.warehouse = {
      outletId,
    };
  }

  const inventories = await prisma.inventory.findMany({
    where,
    include: {
      product: true,
      warehouse: {
        include: {
          outlet: true,
        },
      },
    },
  });

  const totalProducts = inventories.length;
  const lowStockItems = inventories.filter(
    (inv) => parseFloat(inv.quantityOnHand) <= parseFloat(inv.minimumStock),
  );

  return {
    outletId,
    totalProducts,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.map((inv) => ({
      product: inv.product.name,
      warehouse: inv.warehouse.name,
      currentStock: parseFloat(inv.quantityOnHand),
      minimumStock: parseFloat(inv.minimumStock),
    })),
  };
}
