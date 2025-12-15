import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getBusinesses: createMockFn(),
  getBusinessById: createMockFn(),
  updateBusinessStatus: createMockFn(),
  getAllUsers: createMockFn(),
  getUserById: createMockFn(),
  forcePasswordReset: createMockFn(),
  updateUserStatus: createMockFn(),
  getUserSessions: createMockFn(),
  revokeAllSessions: createMockFn(),
  revokeUserSession: createMockFn(),
  impersonateUser: createMockFn(),
  getDashboardStats: createMockFn(),
};

const loggerMock = { error: createMockFn() };
const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
  createAuditLogData: (store, data) => data,
};

mock.module(
  "../../../src/modules/superAdmin/superAdmin.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const controller =
  await import("../../../src/modules/superAdmin/superAdmin.controller.js?unit-test");

describe("modules/superAdmin/superAdmin.controller", () => {
  beforeEach(() => {
    Object.values(serviceMock).forEach((fn) => fn.mockReset());
    loggerMock.error.mockReset();
    jobsMock.enqueueAuditLogJob.mockReset();
  });

  const mockStore = {
    user: { id: "admin1", businessId: "biz-1" },
  };

  it("handles get business by id error", async () => {
    const set = {};
    serviceMock.getBusinessById.mockImplementation(async () => {
      throw new Error("fail");
    });
    const res = await controller.getBusinessByIdController({
      params: { id: "b1" },
      set,
    });
    expect(res.code).toBe("SADM-500-003");
    expect(set.status).toBe(500);
  });

  it("gets businesses list", async () => {
    const set = {};
    serviceMock.getBusinesses.mockResolvedValue({ businesses: [], count: 0 });
    const res = await controller.getBusinessesController({
      query: {},
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getBusinesses.calls.length).toBe(1);
  });

  it("handles get businesses error", async () => {
    const set = {};
    serviceMock.getBusinesses.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getBusinessesController({
      query: {},
      set,
    });

    expect(res.code).toBe("SADM-500-002");
    expect(set.status).toBe(500);
  });

  it("updates business status and logs audit", async () => {
    const set = {};
    serviceMock.updateBusinessStatus.mockResolvedValue({
      updated: { id: "b1", status: "ACTIVE" },
      previousStatus: "INACTIVE",
    });

    const res = await controller.updateBusinessStatusController({
      params: { id: "b1" },
      body: { status: "ACTIVE" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
  });

  it("handles update business status error", async () => {
    const set = {};
    serviceMock.updateBusinessStatus.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updateBusinessStatusController({
      params: { id: "b1" },
      body: { status: "ACTIVE" },
      store: mockStore,
      set,
    });

    expect(res.code).toBe("SADM-400-001");
    expect(set.status).toBe(500);
  });

  it("gets all users with filters", async () => {
    const set = {};
    serviceMock.getAllUsers.mockResolvedValue({ users: [], count: 0 });
    const res = await controller.getAllUsersController({
      query: { isActive: "true" },
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getAllUsers.calls[0][0].isActive).toBe("true");
  });

  it("handles get all users error", async () => {
    const set = {};
    serviceMock.getAllUsers.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getAllUsersController({
      query: {},
      set,
    });

    expect(res.code).toBe("SADM-500-004");
    expect(set.status).toBe(500);
  });

  it("force resets password and logs audit", async () => {
    const set = {};
    serviceMock.forcePasswordReset.mockResolvedValue();

    const res = await controller.forcePasswordResetController({
      params: { id: "u1" },
      body: { newPassword: "new" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
  });

  it("handles force password reset error", async () => {
    const set = {};
    serviceMock.forcePasswordReset.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.forcePasswordResetController({
      params: { id: "u1" },
      body: { newPassword: "new" },
      store: mockStore,
      set,
    });

    expect(res.code).toBe("SADM-400-002");
    expect(set.status).toBe(500);
  });

  it("impersonates user and logs audit", async () => {
    const set = {};
    serviceMock.impersonateUser.mockResolvedValue({
      user: { username: "target" },
      token: "tok",
    });

    const res = await controller.impersonateUserController({
      params: { id: "u2" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
  });

  it("handles impersonate user error", async () => {
    const set = {};
    serviceMock.impersonateUser.mockImplementation(async () => {
      const err = new Error("forbidden");
      err.statusCode = 403;
      throw err;
    });

    const res = await controller.impersonateUserController({
      params: { id: "u2" },
      store: mockStore,
      set,
    });

    expect(res.code).toBe("SADM-403-001");
    expect(set.status).toBe(403);
  });

  it("gets dashboard stats", async () => {
    const set = {};
    serviceMock.getDashboardStats.mockResolvedValue({ totalBusinesses: 10 });
    const res = await controller.getDashboardController({ set });
    expect(res.success).toBe(true);
    expect(serviceMock.getDashboardStats.calls.length).toBe(1);
  });

  it("handles get dashboard stats error", async () => {
    const set = {};
    serviceMock.getDashboardStats.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getDashboardController({ set });

    expect(res.code).toBe("SADM-500-001");
    expect(set.status).toBe(500);
  });

  it("gets user by id", async () => {
    const set = {};
    serviceMock.getUserById.mockResolvedValue({ id: "u2" });
    const res = await controller.getUserByIdController({
      params: { id: "u2" },
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getUserById.calls[0][0]).toBe("u2");
  });

  it("handles get user by id error", async () => {
    const set = {};
    serviceMock.getUserById.mockImplementation(async () => {
      const err = new Error("msg");
      err.statusCode = 400; // Simulating mapped error
      throw err;
    });
    const res = await controller.getUserByIdController({
      params: { id: "u2" },
      set,
    });
    expect(res.code).toBe("SADM-500-005");
    expect(set.status).toBe(400);
  });

  it("updates user status and logs audit", async () => {
    const set = {};
    serviceMock.updateUserStatus.mockResolvedValue({
      id: "u2",
      isActive: true,
    });

    const res = await controller.updateUserStatusController({
      params: { id: "u2" },
      body: { isActive: true },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
  });

  it("handles update user status error", async () => {
    const set = {};
    serviceMock.updateUserStatus.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updateUserStatusController({
      params: { id: "u2" },
      body: { isActive: true },
      store: mockStore,
      set,
    });

    expect(res.code).toBe("SADM-400-003");
    expect(set.status).toBe(500);
  });

  it("gets user sessions", async () => {
    const set = {};
    serviceMock.getUserSessions.mockResolvedValue([]);
    const res = await controller.getUserSessionsController({
      params: { id: "u2" },
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getUserSessions.calls[0][0]).toBe("u2");
  });

  it("handles get user sessions error", async () => {
    const set = {};
    serviceMock.getUserSessions.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getUserSessionsController({
      params: { id: "u2" },
      set,
    });

    expect(res.code).toBe("SADM-500-006");
    expect(set.status).toBe(500);
  });

  it("revokes all sessions and logs audit", async () => {
    const set = {};
    serviceMock.revokeAllSessions.mockResolvedValue();

    const res = await controller.revokeAllSessionsController({
      params: { id: "u2" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
  });

  it("handles revoke all sessions error", async () => {
    const set = {};
    serviceMock.revokeAllSessions.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.revokeAllSessionsController({
      params: { id: "u2" },
      store: mockStore,
      set,
    });

    expect(res.code).toBe("SADM-400-004");
    expect(set.status).toBe(500);
  });

  it("revokes single session and logs audit", async () => {
    const set = {};
    serviceMock.revokeUserSession.mockResolvedValue();

    const res = await controller.revokeSessionController({
      params: { id: "u2", sessionId: "s1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
    expect(serviceMock.revokeUserSession.calls[0][1]).toBe("s1");
  });

  it("handles revoke session error", async () => {
    const set = {};
    serviceMock.revokeUserSession.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.revokeSessionController({
      params: { id: "u2", sessionId: "s1" },
      store: mockStore,
      set,
    });

    expect(res.code).toBe("SADM-400-005");
    expect(set.status).toBe(500);
  });
});
