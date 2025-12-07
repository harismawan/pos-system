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
