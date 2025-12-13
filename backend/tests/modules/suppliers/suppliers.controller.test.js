import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getSuppliers: createMockFn(async () => ({ suppliers: [], pagination: {} })),
  getSupplierById: createMockFn(async () => ({ id: "s1" })),
  createSupplier: createMockFn(async () => ({ id: "s1" })),
  updateSupplier: createMockFn(async () => ({ id: "s1", name: "Updated" })),
  deleteSupplier: createMockFn(async () => ({ message: "deleted" })),
};

const loggerMock = { error: createMockFn() };

mock.module(
  "../../../src/modules/suppliers/suppliers.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const controller =
  await import("../../../src/modules/suppliers/suppliers.controller.js");

const mockStore = {
  user: { id: "u1", businessId: "biz-1" },
  outletId: "store-1",
};

describe("modules/suppliers/suppliers.controller", () => {
  beforeEach(() => {
    serviceMock.getSuppliers.mockReset();
    serviceMock.getSuppliers.mockResolvedValue({
      suppliers: [],
      pagination: {},
    });
    serviceMock.getSupplierById.mockReset();
    serviceMock.getSupplierById.mockResolvedValue({ id: "s1" });
    serviceMock.createSupplier.mockReset();
    serviceMock.createSupplier.mockResolvedValue({ id: "s1" });
    serviceMock.updateSupplier.mockReset();
    serviceMock.updateSupplier.mockResolvedValue({ id: "s1", name: "Updated" });
    serviceMock.deleteSupplier.mockReset();
    serviceMock.deleteSupplier.mockResolvedValue({ message: "deleted" });
    loggerMock.error.mockReset();
  });

  it("returns suppliers list on success", async () => {
    const set = {};
    const res = await controller.getSuppliersController({
      query: { search: "a" },
      store: mockStore,
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getSuppliers.calls[0][0].search).toBe("a");
    expect(serviceMock.getSuppliers.calls[0][0].businessId).toBe("biz-1");
  });

  it("returns error when list fails", async () => {
    const set = {};
    serviceMock.getSuppliers.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getSuppliersController({
      query: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns supplier by id", async () => {
    const set = {};
    const res = await controller.getSupplierByIdController({
      params: { id: "s1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe("s1");
    expect(serviceMock.getSupplierById.calls[0][1]).toBe("biz-1");
  });

  it("sets 404 when supplier not found", async () => {
    const set = {};
    serviceMock.getSupplierById.mockImplementation(async () => {
      throw new Error("Supplier not found");
    });

    const res = await controller.getSupplierByIdController({
      params: { id: "missing" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(404);
    expect(res.success).toBe(false);
  });

  it("uses provided status when get by id fails", async () => {
    const set = {};
    const err = new Error("gone");
    err.statusCode = 410;
    serviceMock.getSupplierById.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.getSupplierByIdController({
      params: { id: "s1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(410);
    expect(res.error).toBe("gone");
  });

  it("creates supplier", async () => {
    const set = {};
    const res = await controller.createSupplierController({
      body: { name: "A" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createSupplier.calls.length).toBe(1);
    expect(serviceMock.createSupplier.calls[0][1]).toBe("biz-1");
  });

  it("returns error when create fails with custom status", async () => {
    const set = {};
    const err = new Error("invalid");
    err.statusCode = 422;
    serviceMock.createSupplier.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.createSupplierController({
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(422);
    expect(res.error).toBe("invalid");
  });

  it("updates supplier", async () => {
    const set = {};
    const res = await controller.updateSupplierController({
      params: { id: "s1" },
      body: { name: "New" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.updateSupplier.calls.length).toBe(1);
    expect(serviceMock.updateSupplier.calls[0][2]).toBe("biz-1");
  });

  it("returns error when update fails", async () => {
    const set = {};
    serviceMock.updateSupplier.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updateSupplierController({
      params: { id: "s1" },
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("deletes supplier", async () => {
    const set = {};
    const res = await controller.deleteSupplierController({
      params: { id: "s1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.deleteSupplier.calls.length).toBe(1);
    expect(serviceMock.deleteSupplier.calls[0][1]).toBe("biz-1");
  });

  it("returns error when delete fails with status", async () => {
    const set = {};
    const err = new Error("fail");
    err.statusCode = 409;
    serviceMock.deleteSupplier.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.deleteSupplierController({
      params: { id: "s1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(409);
    expect(res.error).toBe("fail");
  });
});
