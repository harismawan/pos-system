/**
 * Purchase Orders service
 */

import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma.js";
import { enqueueAuditLogJob } from "../../libs/jobs.js";
import logger from "../../libs/logger.js";

/**
 * Generate unique PO number
 */
async function generatePoNumber(outletId) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
  });

  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `PO-${outlet?.code || "SYS"}-${dateStr}-${random}`;
}

export async function getPurchaseOrders(filters = {}) {
  const {
    supplierId,
    warehouseId,
    outletId,
    status,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  if (supplierId) {
    where.supplierId = supplierId;
  }

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  if (outletId) {
    where.outletId = outletId;
  }

  if (status) {
    where.status = status;
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
        supplier: true,
        warehouse: true,
        outlet: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrder.count({ where }),
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

export async function getPurchaseOrderById(id) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      outlet: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      receivedBy: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Purchase order not found");
  }

  return order;
}

export async function createPurchaseOrder(data, userId) {
  const { supplierId, warehouseId, outletId, expectedDate, notes, items } =
    data;

  const orderNumber = await generatePoNumber(outletId);

  // Calculate totals
  let totalAmount = new Prisma.Decimal(0);
  const orderItems = items.map((item) => {
    const lineTotal = new Prisma.Decimal(item.quantity).mul(
      new Prisma.Decimal(item.unitCost),
    );
    totalAmount = totalAmount.add(lineTotal);

    return {
      productId: item.productId,
      quantityOrdered: item.quantity,
      quantityReceived: 0,
      unitCost: item.unitCost,
      lineTotal,
    };
  });

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      warehouseId,
      outletId,
      orderNumber,
      orderDate: new Date(),
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      totalAmount,
      notes,
      status: "DRAFT",
      createdByUserId: userId,
      items: {
        create: orderItems,
      },
    },
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  enqueueAuditLogJob({
    eventType: "PURCHASE_ORDER_CREATED",
    userId,
    outletId,
    entityType: "PurchaseOrder",
    entityId: order.id,
    payload: {
      orderNumber: order.orderNumber,
      supplierId,
      totalAmount: parseFloat(totalAmount),
    },
  });

  logger.info({ orderId: order.id, orderNumber }, "Purchase order created");

  return order;
}

export async function updatePurchaseOrder(id, data, userId) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
  });

  if (!order) {
    throw new Error("Purchase order not found");
  }

  if (order.status !== "DRAFT") {
    throw new Error("Can only update draft purchase orders");
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      notes: data.notes,
    },
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return updated;
}

export async function receivePurchaseOrder(id, receivedItems, userId) {
  const order = await getPurchaseOrderById(id);

  if (order.status === "RECEIVED") {
    throw new Error("Purchase order already received");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Cannot receive cancelled purchase order");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update PO items with received quantities
    for (const received of receivedItems) {
      const item = order.items.find((i) => i.id === received.itemId);

      if (!item) {
        throw new Error(`Item ${received.itemId} not found in purchase order`);
      }

      await tx.purchaseOrderItem.update({
        where: { id: received.itemId },
        data: {
          quantityReceived: {
            increment: received.quantity,
          },
        },
      });

      // Get or create inventory record
      let inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: order.warehouseId,
          },
        },
      });

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId: item.productId,
            warehouseId: order.warehouseId,
            quantityOnHand: 0,
            minimumStock: 0,
          },
        });
      }

      // Update inventory
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: order.warehouseId,
          },
        },
        data: {
          quantityOnHand: {
            increment: received.quantity,
          },
        },
      });

      // Create stock movement
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          toWarehouseId: order.warehouseId,
          outletId: order.outletId,
          type: "PURCHASE",
          quantity: received.quantity,
          reference: order.orderNumber,
          notes: `Received from PO ${order.orderNumber}`,
          createdByUserId: userId,
        },
      });
    }

    // Update PO status to RECEIVED
    const updatedOrder = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: "RECEIVED",
        receivedByUserId: userId,
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return updatedOrder;
  });

  enqueueAuditLogJob({
    eventType: "PURCHASE_ORDER_RECEIVED",
    userId,
    outletId: order.outletId,
    entityType: "PurchaseOrder",
    entityId: order.id,
    payload: {
      orderNumber: order.orderNumber,
      receivedItems: receivedItems.length,
    },
  });

  logger.info(
    { orderId: order.id, orderNumber: order.orderNumber },
    "Purchase order received",
  );

  return result;
}

export async function cancelPurchaseOrder(id, userId) {
  const order = await getPurchaseOrderById(id);

  if (order.status === "RECEIVED") {
    throw new Error("Cannot cancel received purchase order");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Purchase order already cancelled");
  }

  const cancelled = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "CANCELLED",
    },
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  enqueueAuditLogJob({
    eventType: "PURCHASE_ORDER_CANCELLED",
    userId,
    outletId: order.outletId,
    entityType: "PurchaseOrder",
    entityId: order.id,
    payload: {
      orderNumber: order.orderNumber,
    },
  });

  logger.info(
    { orderId: order.id, orderNumber: order.orderNumber },
    "Purchase order cancelled",
  );

  return cancelled;
}
