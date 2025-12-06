/**
 * Products service
 */

import prisma from '../../libs/prisma.js';

export async function getProducts(filters = {}) {
    const { search, category, isActive, page = 1, limit = 50, outletId } = filters;

    const where = {};

    if (search) {
        where.OR = [
            { sku: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
        ];
    }

    if (category) {
        where.category = category;
    }

    if (isActive !== undefined) {
        // Convert string "true"/"false" to boolean
        where.isActive = isActive === 'true' || isActive === true;
    }

    // Ensure page and limit are numbers
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 50;
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limitNumber,
            include: {
                inventories: outletId ? {
                    where: {
                        warehouse: {
                            outletId,
                        },
                    },
                    include: {
                        warehouse: true,
                    },
                } : undefined,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.product.count({ where }),
    ]);

    return {
        products,
        pagination: {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        },
    };
}

export async function getProductById(id) {
    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            inventories: {
                include: {
                    warehouse: {
                        include: {
                            outlet: true,
                        },
                    },
                },
            },
            priceTiers: {
                include: {
                    priceTier: true,
                    outlet: true,
                },
            },
        },
    });

    if (!product) {
        throw new Error('Product not found');
    }

    return product;
}

export async function createProduct(data) {
    const product = await prisma.product.create({
        data,
    });

    return product;
}

export async function updateProduct(id, data) {
    const product = await prisma.product.update({
        where: { id },
        data,
    });

    return product;
}

export async function deleteProduct(id) {
    await prisma.product.update({
        where: { id },
        data: { isActive: false },
    });

    return { message: 'Product deactivated successfully' };
}
