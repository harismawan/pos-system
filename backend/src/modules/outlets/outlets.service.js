/**
 * Outlets service
 */

import prisma from '../../libs/prisma.js';
import { enqueueAuditLogJob } from '../../libs/jobs.js';

export async function getOutlets(filters = {}) {
    const { isActive, page = 1, limit = 50 } = filters;

    const where = {};

    if (isActive !== undefined) {
        where.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [outlets, total] = await Promise.all([
        prisma.outlet.findMany({
            where,
            skip,
            take: limit,
            include: {
                defaultPriceTier: true,
                warehouses: true,
                posRegisters: true,
                _count: {
                    select: {
                        outletUsers: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.outlet.count({ where }),
    ]);

    return {
        outlets,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getOutletById(id) {
    const outlet = await prisma.outlet.findUnique({
        where: { id },
        include: {
            defaultPriceTier: true,
            warehouses: true,
            posRegisters: true,
            outletUsers: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });

    if (!outlet) {
        throw new Error('Outlet not found');
    }

    return outlet;
}

export async function createOutlet(data, userId) {
    const outlet = await prisma.outlet.create({
        data,
        include: {
            defaultPriceTier: true,
        },
    });

    enqueueAuditLogJob({
        eventType: 'OUTLET_CREATED',
        userId,
        outletId: outlet.id,
        entityType: 'Outlet',
        entityId: outlet.id,
        payload: {
            name: outlet.name,
            code: outlet.code,
        },
    });

    return outlet;
}

export async function updateOutlet(id, data, userId) {
    const outlet = await prisma.outlet.update({
        where: { id },
        data,
        include: {
            defaultPriceTier: true,
        },
    });

    enqueueAuditLogJob({
        eventType: 'OUTLET_UPDATED',
        userId,
        outletId: outlet.id,
        entityType: 'Outlet',
        entityId: outlet.id,
        payload: {
            name: outlet.name,
            code: outlet.code,
        },
    });

    return outlet;
}

export async function deleteOutlet(id) {
    // Check if outlet has orders
    const orderCount = await prisma.posOrder.count({
        where: { outletId: id },
    });

    if (orderCount > 0) {
        throw new Error('Cannot delete outlet with existing orders');
    }

    await prisma.outlet.delete({
        where: { id },
    });

    return { message: 'Outlet deleted successfully' };
}

/**
 * Get outlet users
 */
export async function getOutletUsers(outletId) {
    const outletUsers = await prisma.outletUser.findMany({
        where: { outletId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                },
            },
        },
    });

    return outletUsers;
}

/**
 * Assign user to outlet
 */
export async function assignUserToOutlet(data, adminUserId) {
    const { userId, outletId, outletRole, isDefaultForUser } = data;

    // If isDefaultForUser is true, unset other defaults for this user
    if (isDefaultForUser) {
        await prisma.outletUser.updateMany({
            where: { userId, isDefaultForUser: true },
            data: { isDefaultForUser: false },
        });
    }

    const outletUser = await prisma.outletUser.upsert({
        where: {
            userId_outletId: {
                userId,
                outletId,
            },
        },
        update: {
            outletRole,
            isDefaultForUser,
        },
        create: {
            userId,
            outletId,
            outletRole,
            isDefaultForUser,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                },
            },
            outlet: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    });

    enqueueAuditLogJob({
        eventType: 'USER_ASSIGNED_TO_OUTLET',
        userId: adminUserId,
        outletId,
        entityType: 'OutletUser',
        entityId: outletUser.id,
        payload: {
            assignedUserId: userId,
            outletRole,
        },
    });

    return outletUser;
}

/**
 * Remove user from outlet
 */
export async function removeUserFromOutlet(userId, outletId, adminUserId) {
    await prisma.outletUser.delete({
        where: {
            userId_outletId: {
                userId,
                outletId,
            },
        },
    });

    enqueueAuditLogJob({
        eventType: 'USER_REMOVED_FROM_OUTLET',
        userId: adminUserId,
        outletId,
        entityType: 'OutletUser',
        entityId: `${userId}-${outletId}`,
        payload: {
            removedUserId: userId,
        },
    });

    return { message: 'User removed from outlet successfully' };
}
