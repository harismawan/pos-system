/**
 * Inventory service
 */

import { Prisma } from '@prisma/client';
import prisma from '../../libs/prisma.js';
import { enqueueAuditLogJob } from '../../libs/jobs.js';
import logger from '../../libs/logger.js';

/**
 * Get inventory with filters
 */
export async function getInventory(filters = {}) {
    const { productId, warehouseId, outletId, lowStock, page = 1, limit = 50 } = filters;

    const skip = (page - 1) * limit;

    // If lowStock filter is used, we need a raw query since Prisma doesn't support column-to-column comparison
    if (lowStock) {
        const conditions = ['i.quantity_on_hand <= i.minimum_stock'];
        const params = [];

        if (productId) {
            params.push(productId);
            conditions.push(`i.product_id = $${params.length}`);
        }

        if (warehouseId) {
            params.push(warehouseId);
            conditions.push(`i.warehouse_id = $${params.length}`);
        }

        if (outletId) {
            params.push(outletId);
            conditions.push(`w.outlet_id = $${params.length}`);
        }

        const whereClause = conditions.join(' AND ');

        // Count query
        const countQuery = `
            SELECT COUNT(*)::int as count
            FROM inventories i
            JOIN warehouses w ON i.warehouse_id = w.id
            WHERE ${whereClause}
        `;
        const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
        const total = countResult[0]?.count || 0;

        // Get inventory IDs that match low stock condition
        const idsQuery = `
            SELECT i.id
            FROM inventories i
            JOIN warehouses w ON i.warehouse_id = w.id
            WHERE ${whereClause}
            ORDER BY i.created_at DESC
            LIMIT ${limit} OFFSET ${skip}
        `;
        const idsResult = await prisma.$queryRawUnsafe(idsQuery, ...params);
        const ids = idsResult.map(r => r.id);

        // Fetch full records with relations using Prisma
        const inventories = ids.length > 0 ? await prisma.inventory.findMany({
            where: { id: { in: ids } },
            include: {
                product: true,
                warehouse: {
                    include: {
                        outlet: true,
                    },
                },
            },
            orderBy: [
                { warehouse: { outlet: { name: 'asc' } } },
                { product: { name: 'asc' } },
            ],
        }) : [];

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
    const where = {};

    if (productId) {
        where.productId = productId;
    }

    if (warehouseId) {
        where.warehouseId = warehouseId;
    }

    if (outletId) {
        where.warehouse = {
            outletId,
        };
    }

    const [inventories, total] = await Promise.all([
        prisma.inventory.findMany({
            where,
            skip,
            take: limit,
            include: {
                product: true,
                warehouse: {
                    include: {
                        outlet: true,
                    },
                },
            },
            orderBy: [
                { warehouse: { outlet: { name: 'asc' } } },
                { product: { name: 'asc' } },
            ],
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

/**
 * Adjust inventory (increase or decrease)
 */
export async function adjustInventory(data, userId) {
    const { productId, warehouseId, outletId, quantity, type, notes } = data;

    if (!['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].includes(type)) {
        throw new Error('Invalid adjustment type. Use ADJUSTMENT_IN or ADJUSTMENT_OUT');
    }

    const adjustmentQuantity = type === 'ADJUSTMENT_IN' ?
        Math.abs(quantity) :
        -Math.abs(quantity);

    const result = await prisma.$transaction(async (tx) => {
        // Get or create inventory record
        let inventory = await tx.inventory.findUnique({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId,
                },
            },
        });

        if (!inventory) {
            inventory = await tx.inventory.create({
                data: {
                    productId,
                    warehouseId,
                    quantityOnHand: 0,
                    minimumStock: 0,
                },
            });
        }

        // Check if adjustment would result in negative inventory
        const newQuantity = parseFloat(inventory.quantityOnHand) + parseFloat(adjustmentQuantity);
        if (newQuantity < 0) {
            throw new Error('Adjustment would result in negative inventory');
        }

        // Update inventory
        const updated = await tx.inventory.update({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId,
                },
            },
            data: {
                quantityOnHand: {
                    increment: adjustmentQuantity,
                },
            },
            include: {
                product: true,
                warehouse: true,
            },
        });

        // Create stock movement record
        await tx.stockMovement.create({
            data: {
                productId,
                fromWarehouseId: type === 'ADJUSTMENT_OUT' ? warehouseId : null,
                toWarehouseId: type === 'ADJUSTMENT_IN' ? warehouseId : null,
                outletId,
                type,
                quantity: new Prisma.Decimal(Math.abs(adjustmentQuantity)),
                notes,
                createdByUserId: userId,
            },
        });

        return updated;
    });

    enqueueAuditLogJob({
        eventType: 'INVENTORY_ADJUSTED',
        userId,
        outletId,
        entityType: 'Inventory',
        entityId: result.id,
        payload: {
            productId,
            warehouseId,
            type,
            quantity: adjustmentQuantity,
        },
    });

    logger.info({ productId, warehouseId, quantity: adjustmentQuantity, type }, 'Inventory adjusted');

    return result;
}

/**
 * Transfer inventory between warehouses
 */
export async function transferInventory(data, userId) {
    const { productId, fromWarehouseId, toWarehouseId, outletId, quantity, notes } = data;

    if (fromWarehouseId === toWarehouseId) {
        throw new Error('Cannot transfer to the same warehouse');
    }

    const result = await prisma.$transaction(async (tx) => {
        // Get source inventory
        const sourceInventory = await tx.inventory.findUnique({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId: fromWarehouseId,
                },
            },
        });

        if (!sourceInventory) {
            throw new Error('Source inventory not found');
        }

        if (parseFloat(sourceInventory.quantityOnHand) < parseFloat(quantity)) {
            throw new Error('Insufficient inventory for transfer');
        }

        // Decrease source inventory
        const updatedSource = await tx.inventory.update({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId: fromWarehouseId,
                },
            },
            data: {
                quantityOnHand: {
                    decrement: quantity,
                },
            },
            include: {
                warehouse: true,
                product: true,
            },
        });

        // Get or create destination inventory
        let destInventory = await tx.inventory.findUnique({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId: toWarehouseId,
                },
            },
        });

        if (!destInventory) {
            destInventory = await tx.inventory.create({
                data: {
                    productId,
                    warehouseId: toWarehouseId,
                    quantityOnHand: 0,
                    minimumStock: 0,
                },
            });
        }

        // Increase destination inventory
        const updatedDest = await tx.inventory.update({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId: toWarehouseId,
                },
            },
            data: {
                quantityOnHand: {
                    increment: quantity,
                },
            },
            include: {
                warehouse: true,
                product: true,
            },
        });

        // Create stock movement record
        await tx.stockMovement.create({
            data: {
                productId,
                fromWarehouseId,
                toWarehouseId,
                outletId,
                type: 'TRANSFER',
                quantity,
                notes,
                createdByUserId: userId,
            },
        });

        return {
            source: updatedSource,
            destination: updatedDest,
        };
    });

    enqueueAuditLogJob({
        eventType: 'INVENTORY_TRANSFERRED',
        userId,
        outletId,
        entityType: 'StockMovement',
        entityId: `${productId}-${fromWarehouseId}-${toWarehouseId}`,
        payload: {
            productId,
            fromWarehouseId,
            toWarehouseId,
            quantity: parseFloat(quantity),
        },
    });

    logger.info({ productId, fromWarehouseId, toWarehouseId, quantity }, 'Inventory transferred');

    return result;
}

/**
 * Get stock movements
 */
export async function getStockMovements(filters = {}) {
    const { productId, warehouseId, outletId, type, page = 1, limit = 50 } = filters;

    const where = {};

    if (productId) {
        where.productId = productId;
    }

    if (warehouseId) {
        where.OR = [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId },
        ];
    }

    if (outletId) {
        where.outletId = outletId;
    }

    if (type) {
        where.type = type;
    }

    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
            where,
            skip,
            take: limit,
            include: {
                product: true,
                fromWarehouse: true,
                toWarehouse: true,
                outlet: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMovement.count({ where }),
    ]);

    return {
        movements,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
