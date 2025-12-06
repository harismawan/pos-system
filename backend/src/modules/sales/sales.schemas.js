/**
 * Sales schemas for request validation
 */

import { t } from 'elysia';
import { commonSchemas } from '../../libs/validation.js';

// POS Order Item schema (reusable)
const posOrderItemSchema = t.Object({
    productId: t.String(),
    quantity: t.Numeric({ minimum: 0.01 }),
    unitPrice: t.Optional(t.Numeric({ minimum: 0 })),
    discountAmount: t.Optional(t.Numeric({ minimum: 0, default: 0 })),
});

// POST /sales/orders body
export const createPosOrderBodySchema = {
    body: t.Object({
        outletId: t.String(),
        warehouseId: t.String(),
        registerId: t.Optional(t.Nullable(t.String())),
        customerId: t.Optional(t.Nullable(t.String())),
        items: t.Array(posOrderItemSchema, { minItems: 1 }),
        notes: t.Optional(t.Nullable(t.String())),
    }),
};

// GET /sales/orders query
export const getPosOrdersQuerySchema = {
    query: t.Object({
        outletId: t.Optional(t.String()),
        status: t.Optional(t.Union([t.Literal('OPEN'), t.Literal('COMPLETED'), t.Literal('CANCELLED')])),
        paymentStatus: t.Optional(t.Union([t.Literal('UNPAID'), t.Literal('PARTIAL'), t.Literal('PAID')])),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        ...commonSchemas.pagination,
    }),
};

// GET /sales/orders/:id params
export const posOrderIdParamSchema = {
    params: t.Object({
        id: t.String(),
    }),
};

// POST /sales/orders/:id/payments body
export const addPaymentBodySchema = {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Object({
        method: t.Union([
            t.Literal('CASH'),
            t.Literal('CARD'),
            t.Literal('E_WALLET'),
            t.Literal('BANK_TRANSFER'),
        ]),
        amount: t.Numeric({ minimum: 0.01 }),
        paidAt: t.Optional(t.String()),
        reference: t.Optional(t.String()),
    }),
};
