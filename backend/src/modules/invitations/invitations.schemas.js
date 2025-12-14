/**
 * Invitations route schemas (Elysia/TypeBox validation)
 */

import { t } from "elysia";

export const createInvitationSchema = {
  body: t.Object({
    email: t.String({ format: "email" }),
    role: t.Union([
      t.Literal("OWNER"),
      t.Literal("ADMIN"),
      t.Literal("MANAGER"),
      t.Literal("CASHIER"),
      t.Literal("WAREHOUSE_STAFF"),
    ]),
  }),
};

export const getInvitationsSchema = {
  query: t.Object({
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
  }),
};

export const cancelInvitationSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

export const resendInvitationSchema = {
  params: t.Object({
    id: t.String(),
  }),
};

export const verifyInvitationSchema = {
  params: t.Object({
    token: t.String(),
  }),
};

export const acceptInvitationSchema = {
  body: t.Object({
    token: t.String(),
    name: t.String({ minLength: 2 }),
    username: t.String({ minLength: 3 }),
    password: t.String({ minLength: 8 }),
    phone: t.Optional(t.String()),
  }),
};
