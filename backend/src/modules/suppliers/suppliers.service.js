/**
 * Suppliers service
 */

import prisma from "../../libs/prisma.js";

export async function getSuppliers(filters = {}) {
  const { search, isActive, page = 1, limit = 50, businessId } = filters;

  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const where = { businessId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contactPerson: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    suppliers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSupplierById(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          warehouse: true,
          outlet: true,
        },
      },
    },
  });

  if (!supplier || supplier.businessId !== businessId) {
    throw new Error("Supplier not found");
  }

  return supplier;
}

export async function createSupplier(data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const supplier = await prisma.supplier.create({
    data: {
      ...data,
      businessId,
    },
  });

  return supplier;
}

export async function updateSupplier(id, data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify supplier belongs to business
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    throw new Error("Supplier not found");
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data,
  });

  return supplier;
}

export async function deleteSupplier(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify supplier belongs to business
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    throw new Error("Supplier not found");
  }

  // Check if supplier has purchase orders
  const orderCount = await prisma.purchaseOrder.count({
    where: { supplierId: id },
  });

  if (orderCount > 0) {
    throw new Error("Cannot delete supplier with existing purchase orders");
  }

  await prisma.supplier.delete({
    where: { id },
  });

  return { message: "Supplier deleted successfully" };
}
