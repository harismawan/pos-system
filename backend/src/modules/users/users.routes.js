/**
 * Users routes
 */

import { Elysia } from "elysia";
import * as usersController from "./users.controller.js";
import * as usersSchemas from "./users.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission } from "../../libs/permissions.js";
import { PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(withRequestLogger())
  // GET /users - List users
  .get("/", usersController.getUsersController, {
    ...usersSchemas.getUsersSchema,
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_VIEW)],
  })
  // GET /users/:id - Get user by ID
  .get("/:id", usersController.getUserByIdController, {
    ...usersSchemas.getUserByIdSchema,
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_VIEW)],
  })
  // POST /users - Create user
  .post("/", usersController.createUserController, {
    ...usersSchemas.createUserSchema,
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_CREATE)],
  })
  // PUT /users/:id - Update user
  .put("/:id", usersController.updateUserController, {
    ...usersSchemas.updateUserSchema,
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_EDIT)],
  })
  // DELETE /users/:id - Delete (deactivate) user
  .delete("/:id", usersController.deleteUserController, {
    ...usersSchemas.deleteUserSchema,
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_DELETE)],
  })
  // POST /users/:id/outlets - Assign user to outlet
  .post("/:id/outlets", usersController.assignOutletController, {
    ...usersSchemas.assignOutletSchema,
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_EDIT)],
  })
  // DELETE /users/:id/outlets/:outletId - Remove user from outlet
  .delete("/:id/outlets/:outletId", usersController.removeOutletController, {
    ...usersSchemas.removeOutletSchema,
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.USERS_EDIT)],
  });
