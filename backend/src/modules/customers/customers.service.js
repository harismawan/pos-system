/**
 * Customers service
 */

import prisma from "../../libs/prisma.js";

export async function getCustomers(filters = {}) {
  const {
    search,
    priceTierId,
    isMember,
    page = 1,
    limit = 50,
    businessId,
  } = filters;

  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const where = { businessId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (priceTierId) {
    where.priceTierId = priceTierId;
  }

  if (isMember !== undefined) {
    where.isMember = isMember;
  }

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      include: {
        priceTier: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerById(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      priceTier: true,
      posOrders: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer || customer.businessId !== businessId) {
    throw new Error("Customer not found");
  }

  return customer;
}

export async function createCustomer(data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const customer = await prisma.customer.create({
    data: {
      ...data,
      businessId,
    },
    include: {
      priceTier: true,
    },
  });

  return customer;
}

export async function updateCustomer(id, data, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify customer belongs to business
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    throw new Error("Customer not found");
  }

  const customer = await prisma.customer.update({
    where: { id },
    data,
    include: {
      priceTier: true,
    },
  });

  return customer;
}

export async function deleteCustomer(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Verify customer belongs to business
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId) {
    throw new Error("Customer not found");
  }

  // Check if customer has orders
  const orderCount = await prisma.posOrder.count({
    where: { customerId: id },
  });

  if (orderCount > 0) {
    throw new Error("Cannot delete customer with existing orders");
  }

  await prisma.customer.delete({
    where: { id },
  });

  return { message: "Customer deleted successfully" };
}
