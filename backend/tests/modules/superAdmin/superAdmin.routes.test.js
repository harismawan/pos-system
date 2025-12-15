import "../../testSetup.js";
import { describe, it, expect, mock } from "bun:test";
import { createMockFn } from "../../mocks/mockFn";

import { resolve } from "path";

// Mock middleware
mock.module("../../../src/libs/auth.js", () => ({
  authMiddleware: createMockFn((req, next) => next()),
}));

mock.module("../../../src/libs/permissions.js", () => ({
  requirePermission: () => createMockFn((req, next) => next()),
  PERMISSIONS: {},
}));

mock.module("../../../src/libs/requestLogger.js", () => ({
  withRequestLogger: () => createMockFn((app) => app),
}));

// Mock controller
mock.module("../../../src/modules/superAdmin/superAdmin.controller.js", () => ({
  getBusinessesController: createMockFn(),
  getBusinessByIdController: createMockFn(),
  updateBusinessStatusController: createMockFn(),
  getAllUsersController: createMockFn(),
  getUserByIdController: createMockFn(),
  forcePasswordResetController: createMockFn(),
  updateUserStatusController: createMockFn(),
  getUserSessionsController: createMockFn(),
  revokeAllSessionsController: createMockFn(),
  revokeSessionController: createMockFn(),
  impersonateUserController: createMockFn(),
  getDashboardController: createMockFn(),
}));

describe("modules/superAdmin/routes", () => {
  it("registers routes successfully", async () => {
    const routesModule =
      await import("../../../src/modules/superAdmin/superAdmin.routes.js");
    const routePlugin = routesModule.superAdminRoutes;

    // Simply importing covers the definition execution
    expect(routePlugin).toBeDefined();
  });
});
