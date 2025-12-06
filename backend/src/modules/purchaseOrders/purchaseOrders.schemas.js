/**
 * Purchase Orders schemas for request validation
 */

import { t } from 'elysia';
import { commonSchemas } from '../../libs/validation.js';

// Purchase Order Item schema (reusable)
const purchaseOrderItemSchema = t.Object({
    productId: t.String(),
    quantityOrdered: t.Numeric({ minimum: 0.01 }),
    unitCost: t.Numeric({ minimum: 0 }),
});

// GET /purchase-orders query
export const getPurchaseOrdersQuerySchema = {
    query: t.Object({
        outletId: t.Optional(t.String()),
        warehouseId: t.Optional(t.String()),
        supplierId: t.Optional(t.String()),
        status: t.Optional(
            t.Union([
                t.Literal('DRAFT'),
                t.Literal('ORDERED'),
                t.Literal('RECEIVED'),
                t.Literal('CANCELLED'),
            ])
        ),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        ...commonSchemas.pagination,
    }),
};

// GET /purchase-orders/:id params
export const purchaseOrderIdParamSchema = {
    params: t.Object({
        id: t.String(),
    }),
};

// POST /purchase-orders body
export const createPurchaseOrderBodySchema = {
    body: t.Object({
        supplierId: t.String(),
        warehouseId: t.String(),
        outletId: t.String(),
        orderDate: t.String(),
        expectedDate: t.Optional(t.String()),
        items: t.Array(purchaseOrderItemSchema, { minItems: 1 }),
        notes: t.Optional(t.String()),
    }),
};

// PUT /purchase-orders/:id body
export const updatePurchaseOrderBodySchema = {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Partial(
        t.Object({
            supplierId: t.String(),
            warehouseId: t.String(),
            outletId: t.String(),
            orderDate: t.String(),
            expectedDate: t.String(),
            notes: t.String(),
        })
    ),
};

// POST /purchase-orders/:id/receive body
export const receiveItemsBodySchema = {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Object({
        items: t.Array(
            t.Object({
                productId: t.String(),
                quantityReceived: t.Numeric({ minimum: 0.01 }),
            }),
            { minItems: 1 }
        ),
    }),
};
