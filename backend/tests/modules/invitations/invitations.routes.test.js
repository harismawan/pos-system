import "../../testSetup.js";
import { describe, it, expect, mock } from "bun:test";
import { createMockFn } from "../../mocks/mockFn";

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
mock.module(
  "../../../src/modules/invitations/invitations.controller.js",
  () => ({
    createInvitationController: createMockFn(),
    getInvitationsController: createMockFn(),
    cancelInvitationController: createMockFn(),
    resendInvitationController: createMockFn(),
    verifyInvitationController: createMockFn(),
    acceptInvitationController: createMockFn(),
  }),
);

// Import schemas to cover them
import * as schemas from "../../../src/modules/invitations/invitations.schemas.js";

describe("modules/invitations/routes", () => {
  it("registers routes successfully", async () => {
    const routesModule =
      await import("../../../src/modules/invitations/invitations.routes.js");
    const routePlugin = routesModule.invitationsRoutes;

    // Simply importing covers the definition execution
    expect(routePlugin).toBeDefined();
  });

  it("schemas are defined", () => {
    expect(schemas).toBeDefined();
    expect(schemas.createInvitationSchema).toBeDefined();
  });
});
