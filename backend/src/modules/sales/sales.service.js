/**
 * Sales (POS) service
 * Handles POS order creation, completion, and inventory updates
 */

import { Prisma } from '@prisma/client';
import prisma from '../../libs/prisma.js';
import { resolvePrice } from '../pricing/pricing.service.js';
import { enqueueAuditLogJob, enqueueEmailNotificationJob } from '../../libs/jobs.js';
import logger from '../../libs/logger.js';

/**
 * Create a new POS order
 */
export async function createPosOrder(data, userId) {
    const { outletId, warehouseId, registerId, customerId, items, notes } = data;

    // Generate order number
    const orderNumber = await generateOrderNumber(outletId);

    // Calculate prices for all items
    const itemsWithPrices = await Promise.all(
        items.map(async (item) => {
            const pricing = await resolvePrice(item.productId, outletId, customerId);

            const quantity = parseFloat(item.quantity);
            const unitPrice = pricing.effectivePrice;
            const discountAmount = parseFloat(item.discountAmount || 0);
            const taxAmount = pricing.taxRate ?
                (unitPrice * quantity - discountAmount) * (pricing.taxRate / 100) : 0;
            const lineTotal = unitPrice * quantity - discountAmount + taxAmount;

            return {
                productId: item.productId,
                quantity,
                unitPrice,
                discountAmount,
                taxAmount,
                lineTotal,
                effectivePriceTierId: pricing.priceTier?.id || null,
            };
        })
    );

    // Calculate totals
    const subtotalAmount = itemsWithPrices.reduce((sum, item) =>
        sum + (item.unitPrice * item.quantity), 0);
    const totalDiscountAmount = itemsWithPrices.reduce((sum, item) =>
        sum + item.discountAmount, 0);
    const totalTaxAmount = itemsWithPrices.reduce((sum, item) =>
        sum + item.taxAmount, 0);
    const totalAmount = itemsWithPrices.reduce((sum, item) =>
        sum + item.lineTotal, 0);

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.posOrder.create({
            data: {
                outletId,
                warehouseId,
                registerId,
                customerId,
                cashierId: userId,
                orderNumber,
                status: 'OPEN',
                paymentStatus: 'UNPAID',
                subtotalAmount,
                totalDiscountAmount,
                totalTaxAmount,
                totalAmount,
                notes,
                items: {
                    create: itemsWithPrices,
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                customer: true,
                cashier: true,
            },
        });

        return newOrder;
    });

    logger.info({ orderId: order.id, orderNumber }, 'POS order created');

    return order;
}

/**
 * Get POS order by ID
 */
export async function getPosOrderById(id) {
    const order = await prisma.posOrder.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: true,
                    effectivePriceTier: true,
                },
            },
            customer: true,
            cashier: true,
            outlet: true,
            warehouse: true,
            register: true,
            payments: true,
        },
    });

    if (!order) {
        throw new Error('Order not found');
    }

    return order;
}

/**
 * Get POS orders with filters
 */
export async function getPosOrders(filters = {}) {
    const { outletId, status, customerId, cashierId, page = 1, limit = 50 } = filters;

    const where = {};

    if (outletId) where.outletId = outletId;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (cashierId) where.cashierId = cashierId;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
        prisma.posOrder.findMany({
            where,
            skip,
            take: limit,
            include: {
                customer: true,
                cashier: true,
                outlet: true,
                items: {
                    include: {
                        product: true,
                    },
                },
                payments: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.posOrder.count({ where }),
    ]);

    return {
        orders,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

/**
 * Complete a POS order
 */
export async function completePosOrder(id, userId) {
    const order = await getPosOrderById(id);

    if (order.status !== 'OPEN') {
        throw new Error('Order is not open');
    }

    if (order.paymentStatus !== 'PAID') {
        throw new Error('Order must be fully paid before completion');
    }

    // Complete order and create stock movements in transaction
    const completedOrder = await prisma.$transaction(async (tx) => {
        // Update order status
        const updated = await tx.posOrder.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                closedAt: new Date(),
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                customer: true,
                cashier: true,
                outlet: true,
            },
        });

        // Create stock movements and update inventory
        for (const item of order.items) {
            // Create stock movement
            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    fromWarehouseId: order.warehouseId,
                    toWarehouseId: null,
                    outletId: order.outletId,
                    type: 'SALE',
                    quantity: new Prisma.Decimal(item.quantity).neg(),
                    reference: order.orderNumber,
                    createdByUserId: userId,
                },
            });

            // Update inventory
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: order.warehouseId,
                    },
                },
            });

            if (inventory) {
                await tx.inventory.update({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: order.warehouseId,
                        },
                    },
                    data: {
                        quantityOnHand: {
                            decrement: item.quantity,
                        },
                    },
                });
            }
        }

        return updated;
    });

    // Enqueue background jobs
    enqueueAuditLogJob({
        eventType: 'SALE_COMPLETED',
        userId,
        outletId: order.outletId,
        entityType: 'PosOrder',
        entityId: order.id,
        payload: {
            orderNumber: order.orderNumber,
            totalAmount: parseFloat(order.totalAmount),
            itemCount: order.items.length,
        },
    });

    // Send email receipt if customer has email
    if (order.customer?.email) {
        enqueueEmailNotificationJob({
            toEmail: order.customer.email,
            subject: `Receipt for Order ${order.orderNumber}`,
            templateName: 'order_receipt',
            templateData: {
                orderNumber: order.orderNumber,
                customerName: order.customer.name,
                totalAmount: parseFloat(order.totalAmount),
                items: order.items,
            },
            relatedEntityType: 'PosOrder',
            relatedEntityId: order.id,
        });
    }

    logger.info({ orderId: order.id, orderNumber: order.orderNumber }, 'POS order completed');

    return completedOrder;
}

/**
 * Cancel a POS order
 */
export async function cancelPosOrder(id, userId) {
    const order = await getPosOrderById(id);

    if (order.status !== 'OPEN') {
        throw new Error('Only open orders can be cancelled');
    }

    const cancelled = await prisma.posOrder.update({
        where: { id },
        data: {
            status: 'CANCELLED',
            closedAt: new Date(),
        },
        include: {
            items: {
                include: {
                    product: true,
                },
            },
            customer: true,
            cashier: true,
        },
    });

    enqueueAuditLogJob({
        eventType: 'SALE_CANCELLED',
        userId,
        outletId: order.outletId,
        entityType: 'PosOrder',
        entityId: order.id,
        payload: {
            orderNumber: order.orderNumber,
            reason: 'Cancelled by user',
        },
    });

    logger.info({ orderId: order.id, orderNumber: order.orderNumber }, 'POS order cancelled');

    return cancelled;
}

/**
 * Add payment to order
 */
export async function addPayment(orderId, paymentData) {
    const { method, amount, reference } = paymentData;

    const order = await getPosOrderById(orderId);

    if (order.status !== 'OPEN') {
        throw new Error('Cannot add payment to non-open order');
    }

    const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
            data: {
                posOrderId: orderId,
                method,
                amount,
                paidAt: new Date(),
                reference,
            },
        });

        // Calculate total paid
        const allPayments = await tx.payment.findMany({
            where: { posOrderId: orderId },
        });

        const totalPaid = allPayments.reduce((sum, p) =>
            sum + parseFloat(p.amount), 0);
        const orderTotal = parseFloat(order.totalAmount);

        let paymentStatus = 'UNPAID';
        if (totalPaid >= orderTotal) {
            paymentStatus = 'PAID';
        } else if (totalPaid > 0) {
            paymentStatus = 'PARTIAL';
        }

        const updatedOrder = await tx.posOrder.update({
            where: { id: orderId },
            data: { paymentStatus },
        });

        return { payment, order: updatedOrder };
    });

    logger.info({ orderId, paymentId: result.payment.id, method, amount }, 'Payment added');

    return result;
}

/**
 * Generate unique order number
 */
async function generateOrderNumber(outletId) {
    const outlet = await prisma.outlet.findUnique({
        where: { id: outletId },
    });

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `${outlet?.code || 'POS'}-${dateStr}-${random}`;
}
