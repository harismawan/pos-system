/**
 * Auth routes
 */

import { Elysia } from "elysia";
import * as authController from "./auth.controller.js";
import * as authSchemas from "./auth.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(withRequestLogger())
  .post("/login", authController.loginController, authSchemas.loginSchema)
  .post("/refresh", authController.refreshController, authSchemas.refreshSchema)
  .post(
    "/forgot-password",
    authController.forgotPasswordController,
    authSchemas.forgotPasswordSchema,
  )
  .post(
    "/reset-password",
    authController.resetPasswordController,
    authSchemas.resetPasswordSchema,
  )
  .post("/logout", authController.logoutController, {
    ...authSchemas.logoutSchema,
    beforeHandle: authMiddleware,
  })
  .get("/me", authController.getMeController, {
    beforeHandle: authMiddleware,
  })
  .post("/change-password", authController.changePasswordController, {
    ...authSchemas.changePasswordSchema,
    beforeHandle: authMiddleware,
  });
