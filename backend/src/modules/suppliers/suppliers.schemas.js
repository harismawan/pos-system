/**
 * Suppliers schemas for request validation
 */

import { t } from 'elysia';
import { commonSchemas, addressFields } from '../../libs/validation.js';

// GET /suppliers query parameters
export const getSuppliersQuerySchema = {
    query: t.Object({
        isActive: commonSchemas.booleanString,
        ...commonSchemas.pagination,
    }),
};

// GET /suppliers/:id params
export const supplierIdParamSchema = {
    params: t.Object({
        id: t.String(),
    }),
};

// POST /suppliers body
export const createSupplierBodySchema = {
    body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        contactPerson: t.Optional(t.String({ maxLength: 255 })),
        email: t.Optional(t.String({ format: 'email', maxLength: 255 })),
        phone: commonSchemas.phone,
        ...addressFields,
        taxNumber: t.Optional(t.String({ maxLength: 50 })),
        notes: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean({ default: true })),
    }),
};

// PUT /suppliers/:id body
export const updateSupplierBodySchema = {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Partial(
        t.Object({
            name: t.String({ minLength: 1, maxLength: 255 }),
            contactPerson: t.String({ maxLength: 255 }),
            email: t.String({ format: 'email', maxLength: 255 }),
            phone: t.String({ minLength: 8, maxLength: 20 }),
            addressLine1: t.String({ maxLength: 255 }),
            addressLine2: t.String({ maxLength: 255 }),
            city: t.String({ maxLength: 100 }),
            state: t.String({ maxLength: 100 }),
            postalCode: t.String({ maxLength: 20 }),
            country: t.String({ maxLength: 100 }),
            taxNumber: t.String({ maxLength: 50 }),
            notes: t.String(),
            isActive: t.Boolean(),
        })
    ),
};
