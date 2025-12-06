/**
 * Users schemas - Request/Response validation
 */

import { t } from 'elysia';

// User roles enum
const userRoleEnum = t.Union([
    t.Literal('OWNER'),
    t.Literal('ADMIN'),
    t.Literal('MANAGER'),
    t.Literal('CASHIER'),
    t.Literal('WAREHOUSE_STAFF'),
]);

// Outlet roles enum
const outletRoleEnum = t.Union([
    t.Literal('MANAGER'),
    t.Literal('CASHIER'),
    t.Literal('WAREHOUSE_STAFF'),
]);

// GET /users query schema
export const getUsersSchema = {
    query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
        role: t.Optional(userRoleEnum),
        isActive: t.Optional(t.String()),
    }),
};

// GET /users/:id params schema
export const getUserByIdSchema = {
    params: t.Object({
        id: t.String(),
    }),
};

// POST /users body schema
export const createUserSchema = {
    body: t.Object({
        name: t.String({ minLength: 1 }),
        username: t.String({ minLength: 3, maxLength: 50 }),
        email: t.Optional(t.String({ format: 'email' })),
        phone: t.Optional(t.String()),
        password: t.String({ minLength: 6 }),
        role: userRoleEnum,
    }),
};

// PUT /users/:id body schema
export const updateUserSchema = {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        email: t.Optional(t.Union([t.String({ format: 'email' }), t.Null()])),
        phone: t.Optional(t.Union([t.String(), t.Null()])),
        password: t.Optional(t.String({ minLength: 6 })),
        role: t.Optional(userRoleEnum),
        isActive: t.Optional(t.Boolean()),
    }),
};

// DELETE /users/:id params schema
export const deleteUserSchema = {
    params: t.Object({
        id: t.String(),
    }),
};

// POST /users/:id/outlets body schema
export const assignOutletSchema = {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Object({
        outletId: t.String(),
        outletRole: outletRoleEnum,
        isDefault: t.Optional(t.Boolean()),
    }),
};

// DELETE /users/:id/outlets/:outletId params schema
export const removeOutletSchema = {
    params: t.Object({
        id: t.String(),
        outletId: t.String(),
    }),
};
