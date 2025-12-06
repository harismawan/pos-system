/**
 * Warehouses service
 */

import prisma from '../../libs/prisma.js';
import { enqueueAuditLogJob } from '../../libs/jobs.js';

export async function getWarehouses(filters = {}) {
    const { outletId, type, isActive, page = 1, limit = 50 } = filters;

    const where = {};

    if (outletId) {
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
            orderBy: { createdAt: 'desc' },
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

export async function getWarehouseById(id) {
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
                        name: 'asc',
                    },
                },
            },
        },
    });

    if (!warehouse) {
        throw new Error('Warehouse not found');
    }

    return warehouse;
}

export async function createWarehouse(data, userId) {
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

    enqueueAuditLogJob({
        eventType: 'WAREHOUSE_CREATED',
        userId,
        outletId: warehouse.outletId,
        entityType: 'Warehouse',
        entityId: warehouse.id,
        payload: {
            name: warehouse.name,
            code: warehouse.code,
            type: warehouse.type,
        },
    });

    return warehouse;
}

export async function updateWarehouse(id, data, userId) {
    // If isDefault is being set to true, unset other defaults
    if (data.isDefault) {
        const warehouse = await prisma.warehouse.findUnique({
            where: { id },
        });

        if (warehouse?.outletId) {
            await prisma.warehouse.updateMany({
                where: {
                    outletId: warehouse.outletId,
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

    enqueueAuditLogJob({
        eventType: 'WAREHOUSE_UPDATED',
        userId,
        outletId: warehouse.outletId,
        entityType: 'Warehouse',
        entityId: warehouse.id,
        payload: {
            name: warehouse.name,
            code: warehouse.code,
        },
    });

    return warehouse;
}

export async function deleteWarehouse(id) {
    // Check if warehouse has inventory
    const inventoryCount = await prisma.inventory.count({
        where: { warehouseId: id },
    });

    if (inventoryCount > 0) {
        throw new Error('Cannot delete warehouse with existing inventory');
    }

    await prisma.warehouse.delete({
        where: { id },
    });

    return { message: 'Warehouse deleted successfully' };
}

/**
 * Get warehouse inventory
 */
export async function getWarehouseInventory(warehouseId, filters = {}) {
    const { lowStock, page = 1, limit = 50 } = filters;

    const where = { warehouseId };

    if (lowStock) {
        where.quantityOnHand = {
            lte: prisma.raw('minimum_stock'),
        };
    }

    const skip = (page - 1) * limit;

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
                    name: 'asc',
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
