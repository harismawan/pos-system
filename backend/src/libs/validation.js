/**
 * Shared validation utilities and common schemas
 * Using Elysia's t (TypeBox) for validation
 */

import { t } from 'elysia';

// Common field validators
export const commonSchemas = {
    // UUID validation
    uuid: t.String({ format: 'uuid' }),

    // Email validation
    email: t.String({ format: 'email' }),

    // Phone validation (optional, flexible format)
    phone: t.Optional(t.String({ minLength: 8, maxLength: 20 })),

    // Decimal/numeric strings
    decimal: t.String({ pattern: '^\\d+(\\.\\d{1,2})?$' }),

    // Date string (ISO format)
    dateString: t.String({ format: 'date-time' }),

    // Pagination
    pagination: {
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 50 })),
    },

    // Boolean query param (comes as string from URL)
    booleanString: t.Optional(t.Union([t.Literal('true'), t.Literal('false')])),

    // Active/inactive filter
    isActive: t.Optional(t.Boolean()),
};

// Common response schemas
export const responseSchemas = {
    success: t.Object({
        success: t.Literal(true),
        data: t.Any(),
    }),

    error: t.Object({
        success: t.Literal(false),
        error: t.String(),
        details: t.Optional(t.Any()),
    }),

    pagination: t.Object({
        total: t.Number(),
        page: t.Number(),
        limit: t.Number(),
        totalPages: t.Number(),
    }),
};

// Helper to create paginated response schema
export function paginatedResponse(dataSchema) {
    return t.Object({
        success: t.Literal(true),
        data: t.Object({
            items: t.Array(dataSchema),
            pagination: responseSchemas.pagination,
        }),
    });
}

// Common address fields
export const addressFields = {
    addressLine1: t.Optional(t.String({ maxLength: 255 })),
    addressLine2: t.Optional(t.String({ maxLength: 255 })),
    city: t.Optional(t.String({ maxLength: 100 })),
    state: t.Optional(t.String({ maxLength: 100 })),
    postalCode: t.Optional(t.String({ maxLength: 20 })),
    country: t.Optional(t.String({ maxLength: 100 })),
};
