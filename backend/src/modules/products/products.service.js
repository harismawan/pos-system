/**
 * Products service
 */

import prisma from '../../libs/prisma.js';
import { normalizePagination, buildPaginationMeta } from '../../libs/pagination.js';

export async function getProducts(filters = {}) {
    const { search, category, isActive, page, limit, outletId } = filters;

    // Normalize pagination with max limit enforcement
    const { page: pageNum, limit: limitNum, skip } = normalizePagination({ page, limit });

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

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limitNum,
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
        pagination: buildPaginationMeta(total, pageNum, limitNum),
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
