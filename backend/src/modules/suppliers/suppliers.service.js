/**
 * Suppliers service
 */

import prisma from '../../libs/prisma.js';

export async function getSuppliers(filters = {}) {
    const { search, isActive, page = 1, limit = 50 } = filters;

    const where = {};

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
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
            orderBy: { createdAt: 'desc' },
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

export async function getSupplierById(id) {
    const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
            purchaseOrders: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    warehouse: true,
                    outlet: true,
                },
            },
        },
    });

    if (!supplier) {
        throw new Error('Supplier not found');
    }

    return supplier;
}

export async function createSupplier(data) {
    const supplier = await prisma.supplier.create({
        data,
    });

    return supplier;
}

export async function updateSupplier(id, data) {
    const supplier = await prisma.supplier.update({
        where: { id },
        data,
    });

    return supplier;
}

export async function deleteSupplier(id) {
    // Check if supplier has purchase orders
    const orderCount = await prisma.purchaseOrder.count({
        where: { supplierId: id },
    });

    if (orderCount > 0) {
        throw new Error('Cannot delete supplier with existing purchase orders');
    }

    await prisma.supplier.delete({
        where: { id },
    });

    return { message: 'Supplier deleted successfully' };
}
