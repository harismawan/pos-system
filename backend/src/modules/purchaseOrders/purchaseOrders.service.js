/**
 * Purchase Orders service
 */

import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma.js";

import logger from "../../libs/logger.js";

/**
 * Generate unique PO number with high entropy
 */
async function generatePoNumber(outletId) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
  });

  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  // Use 8 alphanumeric characters for higher entropy (~2.8 billion possibilities)
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let random = "";
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `PO-${outlet?.code || "SYS"}-${dateStr}-${random}`;
}

export async function getPurchaseOrders(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const {
    supplierId,
    warehouseId,
    outletId,
    status,
    page = 1,
    limit = 50,
  } = filters;

  const where = {
    AND: [
      {
        supplier: {
          businessId,
        },
      },
      {
        outlet: {
          businessId,
        },
      },
    ],
  };

  if (supplierId) {
    // Verify supplier belongs to business
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier || supplier.businessId !== businessId) {
      throw new Error("Supplier not found");
    }
    where.supplierId = supplierId;
  }

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  if (outletId) {
    // Verify outlet belongs to business
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
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

export async function getPurchaseOrderById(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

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

  // Verify order belongs to business
  if (
    order.outlet.businessId !== businessId ||
    order.supplier.businessId !== businessId
  ) {
    throw new Error("Purchase order not found");
  }

  return order;
}

export async function createPurchaseOrder(data, userId, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const { supplierId, warehouseId, outletId, expectedDate, notes, items } =
    data;

  // Verify supplier belongs to business
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });
  if (!supplier || supplier.businessId !== businessId) {
    throw new Error("Supplier not found");
  }

  // Verify outlet belongs to business
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  if (!outlet || outlet.businessId !== businessId) {
    throw new Error("Outlet not found");
  }

  // Verify all products belong to business
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product || product.businessId !== businessId) {
      throw new Error(`Product ${item.productId} not found`);
    }
  }

  const orderNumber = await generatePoNumber(outletId);

  // Calculate totals
  let totalAmount = new Prisma.Decimal(0);
  const orderItems = items.map((item) => {
    const lineTotal = new Prisma.Decimal(item.quantityOrdered).mul(
      new Prisma.Decimal(item.unitCost),
    );
    totalAmount = totalAmount.add(lineTotal);

    return {
      productId: item.productId,
      quantityOrdered: item.quantityOrdered,
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

  return order;
}

export async function updatePurchaseOrder(id, data, userId, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { outlet: true },
  });

  if (!order || order.outlet.businessId !== businessId) {
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

export async function receivePurchaseOrder(
  id,
  receivedItems,
  userId,
  businessId,
) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const order = await getPurchaseOrderById(id, businessId);

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

  return result;
}

export async function cancelPurchaseOrder(id, userId, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const order = await getPurchaseOrderById(id, businessId);

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

  return cancelled;
}
