/**
 * Auth schemas for request validation
 * Using Elysia's t (TypeBox) for validation
 */

import { t } from "elysia";

export const loginSchema = {
  body: t.Object({
    username: t.String({ minLength: 3, maxLength: 50 }),
    password: t.String({ minLength: 6 }),
  }),
};

export const refreshSchema = {
  body: t.Object({
    refreshToken: t.String({ minLength: 1 }),
  }),
};

export const forgotPasswordSchema = {
  body: t.Object({
    email: t.String({ format: "email" }),
  }),
};

export const resetPasswordSchema = {
  body: t.Object({
    token: t.String({ minLength: 1 }),
    newPassword: t.String({ minLength: 6 }),
  }),
};

export const changePasswordSchema = {
  body: t.Object({
    currentPassword: t.String({ minLength: 1 }),
    newPassword: t.String({ minLength: 6 }),
  }),
};
