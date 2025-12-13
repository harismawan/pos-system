import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getOutletById: createMockFn(async () => ({ id: "o1" })),
  getOutlets: createMockFn(async () => ({ outlets: [], pagination: {} })),
  createOutlet: createMockFn(async () => ({ id: "o-new" })),
  updateOutlet: createMockFn(async () => ({ id: "o-updated" })),
  deleteOutlet: createMockFn(async () => ({ message: "ok" })),
  getOutletUsers: createMockFn(async () => []),
  assignUserToOutlet: createMockFn(async () => ({ id: "ou-1" })),
  removeUserFromOutlet: createMockFn(async () => ({ message: "removed" })),
};

const loggerMock = { error: createMockFn() };

mock.module(
  "../../../src/modules/outlets/outlets.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const controller =
  await import("../../../src/modules/outlets/outlets.controller.js");

const mockStore = {
  user: { id: "u1", businessId: "biz-1" },
};

describe("modules/outlets/outlets.controller", () => {
  beforeEach(() => {
    serviceMock.getOutletById.mockReset();
    serviceMock.getOutletById.mockResolvedValue({ id: "o1" });
    serviceMock.getOutlets.mockReset();
    serviceMock.getOutlets.mockResolvedValue({ outlets: [], pagination: {} });
    serviceMock.createOutlet.mockReset();
    serviceMock.createOutlet.mockResolvedValue({ id: "o-new" });
    serviceMock.updateOutlet.mockReset();
    serviceMock.updateOutlet.mockResolvedValue({ id: "o-updated" });
    serviceMock.deleteOutlet.mockReset();
    serviceMock.deleteOutlet.mockResolvedValue({ message: "ok" });
    serviceMock.getOutletUsers.mockReset();
    serviceMock.getOutletUsers.mockResolvedValue([]);
    serviceMock.assignUserToOutlet.mockReset();
    serviceMock.assignUserToOutlet.mockResolvedValue({ id: "ou-1" });
    serviceMock.removeUserFromOutlet.mockReset();
    serviceMock.removeUserFromOutlet.mockResolvedValue({ message: "removed" });
    loggerMock.error.mockReset();
  });

  it("returns outlets list", async () => {
    const set = {};
    const res = await controller.getOutletsController({
      query: {},
      store: mockStore,
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getOutlets.calls.length).toBeGreaterThan(0);
    expect(serviceMock.getOutlets.calls[0][0].businessId).toBe("biz-1");
  });

  it("returns error when list fails", async () => {
    const set = {};
    serviceMock.getOutlets.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getOutletsController({
      query: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns outlet by id", async () => {
    const set = {};
    const res = await controller.getOutletByIdController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe("o1");
    expect(serviceMock.getOutletById.calls[0][1]).toBe("biz-1");
  });

  it("returns 404 when outlet is missing", async () => {
    const set = {};
    serviceMock.getOutletById.mockImplementation(async () => {
      throw new Error("Outlet not found");
    });

    const res = await controller.getOutletByIdController({
      params: { id: "missing" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(404);
    expect(res.success).toBe(false);
  });

  it("uses provided status when get outlet fails", async () => {
    const set = {};
    const err = new Error("gone");
    err.statusCode = 410;
    serviceMock.getOutletById.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.getOutletByIdController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(410);
    expect(res.error).toBe("gone");
  });

  it("sets 201 when creating outlet", async () => {
    const set = {};
    const res = await controller.createOutletController({
      body: { name: "Outlet" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createOutlet.calls[0][2]).toBe("biz-1");
  });

  it("returns error when create fails with custom status", async () => {
    const set = {};
    const err = new Error("invalid");
    err.statusCode = 422;
    serviceMock.createOutlet.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.createOutletController({
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(422);
    expect(res.error).toBe("invalid");
  });

  it("updates outlet", async () => {
    const set = {};
    const res = await controller.updateOutletController({
      params: { id: "o1" },
      body: { name: "New" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.updateOutlet.calls.length).toBe(1);
    expect(serviceMock.updateOutlet.calls[0][3]).toBe("biz-1");
  });

  it("returns error when update fails", async () => {
    const set = {};
    serviceMock.updateOutlet.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updateOutletController({
      params: { id: "o1" },
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns error when delete fails", async () => {
    const set = {};
    serviceMock.deleteOutlet.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.deleteOutletController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.success).toBe(false);
  });

  it("deletes outlet successfully", async () => {
    const set = {};
    const res = await controller.deleteOutletController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.deleteOutlet.calls.length).toBe(1);
    expect(serviceMock.deleteOutlet.calls[0][1]).toBe("biz-1");
  });

  it("returns outlet users list", async () => {
    const set = {};
    const res = await controller.getOutletUsersController({
      params: { id: "o1" },
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getOutletUsers.calls.length).toBeGreaterThan(0);
  });

  it("returns error when get outlet users fails", async () => {
    const set = {};
    serviceMock.getOutletUsers.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getOutletUsersController({
      params: { id: "o1" },
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("sets 201 when assigning user to outlet", async () => {
    const set = {};
    const res = await controller.assignUserToOutletController({
      params: { id: "o1" },
      body: { userId: "u1", outletRole: "MANAGER" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
  });

  it("returns error when assign fails", async () => {
    const set = {};
    const err = new Error("conflict");
    err.statusCode = 409;
    serviceMock.assignUserToOutlet.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.assignUserToOutletController({
      params: { id: "o1" },
      body: { userId: "u1", outletRole: "MANAGER" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(409);
    expect(res.error).toBe("conflict");
  });

  it("returns error when removing user fails", async () => {
    const set = {};
    serviceMock.removeUserFromOutlet.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.removeUserFromOutletController({
      params: { id: "o1", userId: "u1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.success).toBe(false);
  });

  it("removes user from outlet", async () => {
    const set = {};
    const res = await controller.removeUserFromOutletController({
      params: { id: "o1", userId: "u1" },
      store: mockStore,
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.removeUserFromOutlet.calls.length).toBe(1);
  });
});
