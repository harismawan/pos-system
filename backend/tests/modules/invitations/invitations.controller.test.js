import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  createInvitation: createMockFn(),
  getInvitations: createMockFn(),
  cancelInvitation: createMockFn(),
  resendInvitation: createMockFn(),
  verifyInvitationToken: createMockFn(),
  acceptInvitation: createMockFn(),
};

const loggerMock = { error: createMockFn() };
const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
  createAuditLogData: (store, data) => data,
};

mock.module(
  "../../../src/modules/invitations/invitations.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const controller =
  await import("../../../src/modules/invitations/invitations.controller.js?unit-test");

describe("modules/invitations/invitations.controller", () => {
  beforeEach(() => {
    serviceMock.createInvitation.mockReset();
    serviceMock.getInvitations.mockReset();
    serviceMock.cancelInvitation.mockReset();
    serviceMock.resendInvitation.mockReset();
    serviceMock.verifyInvitationToken.mockReset();
    serviceMock.acceptInvitation.mockReset();
    loggerMock.error.mockReset();
    jobsMock.enqueueAuditLogJob.mockReset();
  });

  const mockStore = {
    user: { id: "u1", businessId: "biz-1" },
  };

  it("creates invitation successfully", async () => {
    const set = {};
    const headers = { origin: "http://test.com" };
    serviceMock.createInvitation.mockResolvedValue({
      id: "inv1",
      email: "test@example.com",
      role: "ADMIN",
    });

    const res = await controller.createInvitationController({
      body: { email: "test@example.com" },
      store: mockStore,
      set,
      headers,
    });

    expect(res.success).toBe(true);
    expect(set.status).toBe(201);
    expect(serviceMock.createInvitation.calls[0][0].frontendUrl).toBe(
      "http://test.com",
    );
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
  });

  it("handles create invitation error", async () => {
    const set = {};
    serviceMock.createInvitation.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.createInvitationController({
      body: {},
      store: mockStore,
      set,
      headers: {},
    });

    expect(res.code).toBe("INV-400-001");
    expect(set.status).toBe(500);
  });

  it("gets invitations list with pagination", async () => {
    const set = {};
    serviceMock.getInvitations.mockResolvedValue({ invitations: [], count: 0 });

    const res = await controller.getInvitationsController({
      query: { page: "2", limit: "5" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getInvitations.calls[0][0].page).toBe(2);
    expect(serviceMock.getInvitations.calls[0][0].limit).toBe(5);
  });

  it("handles get invitations error", async () => {
    const set = {};
    serviceMock.getInvitations.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getInvitationsController({
      query: {},
      store: mockStore,
      set,
    });

    expect(res.code).toBe("INV-500-001");
    expect(set.status).toBe(500);
  });

  it("cancels invitation and logs audit", async () => {
    const set = {};
    serviceMock.cancelInvitation.mockResolvedValue();

    const res = await controller.cancelInvitationController({
      params: { id: "inv1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
    expect(serviceMock.cancelInvitation.calls[0][0]).toBe("inv1");
  });

  it("handles cancel invitation error", async () => {
    const set = {};
    serviceMock.cancelInvitation.mockImplementation(async () => {
      const err = new Error("not found");
      err.statusCode = 404;
      throw err;
    });

    const res = await controller.cancelInvitationController({
      params: { id: "inv1" },
      store: mockStore,
      set,
    });

    expect(res.code).toBe("INV-400-002");
    expect(set.status).toBe(404);
  });

  it("resends invitation and logs audit", async () => {
    const set = {};
    const headers = {};
    serviceMock.resendInvitation.mockResolvedValue({ sent: true });

    const res = await controller.resendInvitationController({
      params: { id: "inv1" },
      store: mockStore,
      set,
      headers,
    });

    expect(res.success).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
    expect(serviceMock.resendInvitation.calls[0][0]).toBe("inv1");
  });

  it("handles resend invitation error", async () => {
    const set = {};
    serviceMock.resendInvitation.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.resendInvitationController({
      params: { id: "inv1" },
      store: mockStore,
      set,
      headers: {},
    });

    expect(res.code).toBe("INV-400-003");
    expect(set.status).toBe(500);
  });

  it("verifies invitation token", async () => {
    const set = {};
    serviceMock.verifyInvitationToken.mockResolvedValue({
      email: "test@example.com",
    });

    const res = await controller.verifyInvitationController({
      params: { token: "tok1" },
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.verifyInvitationToken.calls[0][0]).toBe("tok1");
  });

  it("handles verify invitation error", async () => {
    const set = {};
    serviceMock.verifyInvitationToken.mockImplementation(async () => {
      const err = new Error("expired");
      err.statusCode = 400;
      throw err;
    });

    const res = await controller.verifyInvitationController({
      params: { token: "tok1" },
      set,
    });

    expect(res.code).toBe("INV-400-004");
    expect(set.status).toBe(400);
  });

  it("accepts invitation and logs audit (public endpoint)", async () => {
    const set = {};
    serviceMock.acceptInvitation.mockResolvedValue({
      user: { id: "u2", email: "new@example.com" },
    });

    const res = await controller.acceptInvitationController({
      body: { token: "tok1", password: "pass" },
      set,
    });

    expect(res.success).toBe(true);
    expect(set.status).toBe(201);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
    // Verified manually constructed audit log
    expect(jobsMock.enqueueAuditLogJob.calls[0][0].eventType).toBe(
      "INVITATION_ACCEPTED",
    );
  });

  it("handles accept invitation error", async () => {
    const set = {};
    serviceMock.acceptInvitation.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.acceptInvitationController({
      body: {},
      set,
    });

    expect(res.code).toBe("INV-400-005");
    expect(set.status).toBe(500);
  });
});
