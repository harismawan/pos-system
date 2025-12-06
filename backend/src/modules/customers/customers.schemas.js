/**
 * Customers schemas for request validation
 */

import { t } from 'elysia';
import { commonSchemas, addressFields } from '../../libs/validation.js';

// GET /customers query parameters
export const getCustomersQuerySchema = {
    query: t.Object({
        search: t.Optional(t.String({ maxLength: 100 })),
        isMember: commonSchemas.booleanString,
        priceTierId: t.Optional(t.String()),
        ...commonSchemas.pagination,
    }),
};

// GET /customers/:id params
export const customerIdParamSchema = {
    params: t.Object({
        id: t.String(),
    }),
};

// POST /customers body
export const createCustomerBodySchema = {
    body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        email: t.Optional(t.String({ format: 'email', maxLength: 255 })),
        phone: commonSchemas.phone,
        ...addressFields,
        priceTierId: t.Optional(t.String()),
        isMember: t.Optional(t.Boolean({ default: false })),
        notes: t.Optional(t.String()),
    }),
};

// PUT /customers/:id body
export const updateCustomerBodySchema = {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Partial(
        t.Object({
            name: t.String({ minLength: 1, maxLength: 255 }),
            email: t.String({ format: 'email', maxLength: 255 }),
            phone: t.String({ minLength: 8, maxLength: 20 }),
            addressLine1: t.String({ maxLength: 255 }),
            addressLine2: t.String({ maxLength: 255 }),
            city: t.String({ maxLength: 100 }),
            state: t.String({ maxLength: 100 }),
            postalCode: t.String({ maxLength: 20 }),
            country: t.String({ maxLength: 100 }),
            priceTierId: t.String(),
            isMember: t.Boolean(),
            notes: t.String(),
        })
    ),
};
