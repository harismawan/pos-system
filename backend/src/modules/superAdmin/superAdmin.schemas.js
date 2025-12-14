/**
 * Super Admin route schemas (Elysia/TypeBox validation)
 */

import { t } from "elysia";

// ============================================
// BUSINESS SCHEMAS
// ============================================

export const getBusinessesSchema = {
  query: t.Object({
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
    search: t.Optional(t.String()),
    status: t.Optional(
      t.Union([
        t.Literal("ACTIVE"),
        t.Literal("SUSPENDED"),
        t.Literal("PENDING"),
      ]),
    ),
  }),
};

export const getBusinessByIdSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

export const updateBusinessStatusSchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Object({
    status: t.Union([
      t.Literal("ACTIVE"),
      t.Literal("SUSPENDED"),
      t.Literal("PENDING"),
    ]),
  }),
};

// ============================================
// USER SCHEMAS
// ============================================

export const getAllUsersSchema = {
  query: t.Object({
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
    search: t.Optional(t.String()),
    role: t.Optional(t.String()),
    isActive: t.Optional(t.String()),
    businessId: t.Optional(t.String()),
  }),
};

export const getUserByIdSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

export const forcePasswordResetSchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Object({
    newPassword: t.String({ minLength: 8 }),
  }),
};

export const updateUserStatusSchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Object({
    isActive: t.Boolean(),
  }),
};

// ============================================
// SESSION SCHEMAS
// ============================================

export const getUserSessionsSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

export const revokeAllSessionsSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

export const revokeSessionSchema = {
  params: t.Object({
    id: t.String(),
    sessionId: t.String(),
  }),
};

// ============================================
// IMPERSONATION SCHEMAS
// ============================================

export const impersonateUserSchema = {
  params: t.Object({
    id: t.String(),
  }),
};
