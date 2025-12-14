/**
 * Warehouses service
 */

import prisma from "../../libs/prisma.js";

export async function getWarehouses(filters = {}, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const { search, outletId, type, isActive, page = 1, limit = 50 } = filters;

  const where = {
    outlet: {
      businessId, // Filter by business
    },
  };

  // Search filter - match on name or code
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
    where.outletId = outletId;
  }

  if (type) {
    where.type = type;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [warehouses, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      skip,
      take: limit,
      include: {
        outlet: true,
        _count: {
          select: {
            inventories: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouse.count({ where }),
  ]);

  return {
    warehouses,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getWarehouseById(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      outlet: true,
      inventories: {
        include: {
          product: true,
        },
        orderBy: {
          product: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!warehouse) {
    throw new Error("Warehouse not found");
  }

  if (warehouse.outlet.businessId !== businessId) {
    throw new Error("Warehouse not found");
  }

  return warehouse;
}

export async function createWarehouse(data, userId, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify outlet belongs to business
  if (data.outletId) {
    const outlet = await prisma.outlet.findUnique({
      where: { id: data.outletId },
    });
    if (!outlet || outlet.businessId !== businessId) {
      throw new Error("Outlet not found");
    }
  }

  // If isDefault is true, unset other defaults for the same outlet
  if (data.isDefault && data.outletId) {
    await prisma.warehouse.updateMany({
      where: {
        outletId: data.outletId,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  const warehouse = await prisma.warehouse.create({
    data,
    include: {
      outlet: true,
    },
  });

  return warehouse;
}

export async function updateWarehouse(id, data, userId, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const existingWarehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { outlet: true },
  });

  if (
    !existingWarehouse ||
    existingWarehouse.outlet.businessId !== businessId
  ) {
    throw new Error("Warehouse not found");
  }

  // If isDefault is being set to true, unset other defaults
  if (data.isDefault) {
    if (existingWarehouse?.outletId) {
      await prisma.warehouse.updateMany({
        where: {
          outletId: existingWarehouse.outletId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }
  }

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data,
    include: {
      outlet: true,
    },
  });

  return warehouse;
}

export async function deleteWarehouse(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { outlet: true },
  });

  if (!warehouse || warehouse.outlet.businessId !== businessId) {
    throw new Error("Warehouse not found");
  }

  // Check if warehouse has inventory
  const inventoryCount = await prisma.inventory.count({
    where: { warehouseId: id },
  });

  if (inventoryCount > 0) {
    throw new Error("Cannot delete warehouse with existing inventory");
  }

  await prisma.warehouse.delete({
    where: { id },
  });

  return { message: "Warehouse deleted successfully" };
}

/**
 * Get warehouse inventory
 */
export async function getWarehouseInventory(
  warehouseId,
  filters = {},
  businessId,
) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    include: { outlet: true },
  });

  if (!warehouse || warehouse.outlet.businessId !== businessId) {
    throw new Error("Warehouse not found");
  }

  const { lowStock, page = 1, limit = 50 } = filters;

  const skip = (page - 1) * limit;

  // If lowStock filter is used, we need a raw query since Prisma doesn't support column-to-column comparison
  if (lowStock) {
    // Count query
    const countResult = await prisma.$queryRawUnsafe(
      `
            SELECT COUNT(*)::int as count
            FROM inventories
            WHERE warehouse_id = $1 AND quantity_on_hand <= minimum_stock
        `,
      warehouseId,
    );
    const total = countResult[0]?.count || 0;

    // Get inventory IDs
    const idsResult = await prisma.$queryRawUnsafe(
      `
            SELECT id
            FROM inventories
            WHERE warehouse_id = $1 AND quantity_on_hand <= minimum_stock
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${skip}
        `,
      warehouseId,
    );
    const ids = idsResult.map((r) => r.id);

    // Fetch full records with relations
    const inventories =
      ids.length > 0
        ? await prisma.inventory.findMany({
            where: { id: { in: ids } },
            include: {
              product: true,
            },
            orderBy: {
              product: {
                name: "asc",
              },
            },
          })
        : [];

    return {
      inventories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Regular query without lowStock filter
  const where = { warehouseId };

  const [inventories, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      include: {
        product: true,
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    }),
    prisma.inventory.count({ where }),
  ]);

  return {
    inventories,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
