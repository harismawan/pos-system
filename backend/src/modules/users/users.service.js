/**
 * Users service - CRUD operations for user management
 */

import prisma from "../../libs/prisma.js";
import bcrypt from "bcryptjs";
import logger from "../../libs/logger.js";
import {
  normalizePagination,
  buildPaginationMeta,
} from "../../libs/pagination.js";

const SALT_ROUNDS = 12;

/**
 * Get users with pagination and filters
 */
export async function getUsers({
  page,
  limit,
  search,
  role,
  isActive,
  businessId,
}) {
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

  const where = { businessId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        outletUsers: {
          include: {
            outlet: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: buildPaginationMeta(total, pageNum, limitNum),
  };
}

/**
 * Get a single user by ID
 */
export async function getUserById(id, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      outletUsers: {
        include: {
          outlet: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });

  if (!user || user.businessId !== businessId) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

/**
 * Create a new user
 */
export async function createUser({
  name,
  username,
  email,
  phone,
  password,
  role,
  businessId,
}) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    const error = new Error("Username already exists");
    error.statusCode = 400;
    throw error;
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      const error = new Error("Email already exists");
      error.statusCode = 400;
      throw error;
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      businessId,
      name,
      username,
      email: email || null,
      phone: phone || null,
      passwordHash,
      role,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Update an existing user
 */
export async function updateUser(
  id,
  { name, email, phone, role, isActive, password },
  businessId,
) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Check user exists
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser || existingUser.businessId !== businessId) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Check email uniqueness if changed
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      const error = new Error("Email already exists");
      error.statusCode = 400;
      throw error;
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email || null;
  if (phone !== undefined) updateData.phone = phone || null;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;

  // Hash new password if provided
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Delete (deactivate) a user
 */
export async function deleteUser(id, requestingUserId, businessId) {
  // businessId is required for multi-tenant isolation
  if (!businessId) {
    throw new Error("businessId is required");
  }

  // Prevent self-deletion
  if (id === requestingUserId) {
    const error = new Error("Cannot delete your own account");
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.businessId !== businessId) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Soft delete - set isActive to false
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true };
}

/**
 * Assign user to an outlet with a specific role
 */
export async function assignUserToOutlet(
  userId,
  outletId,
  outletRole,
  isDefault = false,
) {
  // Check user and outlet exist
  const [user, outlet] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.outlet.findUnique({ where: { id: outletId } }),
  ]);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (!outlet) {
    const error = new Error("Outlet not found");
    error.statusCode = 404;
    throw error;
  }

  // If setting as default, unset other defaults first
  if (isDefault) {
    await prisma.outletUser.updateMany({
      where: { userId, isDefaultForUser: true },
      data: { isDefaultForUser: false },
    });
  }

  const outletUser = await prisma.outletUser.upsert({
    where: {
      userId_outletId: { userId, outletId },
    },
    update: {
      outletRole,
      isDefaultForUser: isDefault,
    },
    create: {
      userId,
      outletId,
      outletRole,
      isDefaultForUser: isDefault,
    },
    include: {
      outlet: { select: { id: true, name: true, code: true } },
    },
  });

  return outletUser;
}

/**
 * Remove user from an outlet
 */
export async function removeUserFromOutlet(userId, outletId) {
  const deleted = await prisma.outletUser.deleteMany({
    where: { userId, outletId },
  });

  if (deleted.count === 0) {
    const error = new Error("User is not assigned to this outlet");
    error.statusCode = 404;
    throw error;
  }

  return { success: true };
}
