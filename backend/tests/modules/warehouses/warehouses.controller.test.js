import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getWarehouseById: createMockFn(async () => ({ id: "w1" })),
  createWarehouse: createMockFn(async () => ({ id: "w1" })),
  getWarehouses: createMockFn(async () => ({ warehouses: [], pagination: {} })),
  updateWarehouse: createMockFn(async () => ({ id: "w1", name: "Updated" })),
  deleteWarehouse: createMockFn(async () => ({ message: "deleted" })),
  getWarehouseInventory: createMockFn(async () => ({ inventory: [] })),
};

const loggerMock = { error: createMockFn() };

mock.module(
  "../../../src/modules/warehouses/warehouses.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const controller =
  await import("../../../src/modules/warehouses/warehouses.controller.js");

describe("modules/warehouses/warehouses.controller", () => {
  beforeEach(() => {
    serviceMock.getWarehouses.mockReset();
    serviceMock.getWarehouses.mockResolvedValue({
      warehouses: [],
      pagination: {},
    });
    serviceMock.getWarehouseById.mockReset();
    serviceMock.getWarehouseById.mockResolvedValue({ id: "w1" });
    serviceMock.createWarehouse.mockReset();
    serviceMock.createWarehouse.mockResolvedValue({ id: "w1" });
    serviceMock.updateWarehouse.mockReset();
    serviceMock.updateWarehouse.mockResolvedValue({
      id: "w1",
      name: "Updated",
    });
    serviceMock.deleteWarehouse.mockReset();
    serviceMock.deleteWarehouse.mockResolvedValue({ message: "deleted" });
    serviceMock.getWarehouseInventory.mockReset();
    serviceMock.getWarehouseInventory.mockResolvedValue({ inventory: [] });
    loggerMock.error.mockReset();
  });

  it("lists warehouses", async () => {
    const set = {};
    const res = await controller.getWarehousesController({ query: {}, set });

    expect(res.success).toBe(true);
    expect(serviceMock.getWarehouses.calls.length).toBe(1);
  });

  it("returns error when list warehouses fails", async () => {
    const set = {};
    serviceMock.getWarehouses.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getWarehousesController({ query: {}, set });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns warehouse by id", async () => {
    const set = {};
    const res = await controller.getWarehouseByIdController({
      params: { id: "w1" },
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe("w1");
  });

  it("sets 404 when warehouse not found", async () => {
    const set = {};
    serviceMock.getWarehouseById.mockImplementation(async () => {
      throw new Error("Warehouse not found");
    });

    const res = await controller.getWarehouseByIdController({
      params: { id: "missing" },
      set,
    });

    expect(set.status).toBe(404);
    expect(res.success).toBe(false);
  });

  it("uses provided status when get by id fails", async () => {
    const set = {};
    const err = new Error("gone");
    err.statusCode = 410;
    serviceMock.getWarehouseById.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.getWarehouseByIdController({
      params: { id: "w1" },
      set,
    });
    expect(set.status).toBe(410);
    expect(res.error).toBe("gone");
  });

  it("sets 201 on create warehouse", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.createWarehouseController({
      body: {},
      store,
      set,
    });
    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createWarehouse.calls.length).toBeGreaterThan(0);
  });

  it("returns error when create fails with custom status", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const err = new Error("invalid");
    err.statusCode = 422;
    serviceMock.createWarehouse.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.createWarehouseController({
      body: {},
      store,
      set,
    });
    expect(set.status).toBe(422);
    expect(res.error).toBe("invalid");
  });

  it("updates warehouse", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.updateWarehouseController({
      params: { id: "w1" },
      body: { name: "New" },
      store,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.updateWarehouse.calls.length).toBe(1);
  });

  it("returns error when update fails", async () => {
    const set = {};
    serviceMock.updateWarehouse.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updateWarehouseController({
      params: { id: "w1" },
      body: {},
      store: { user: { id: "u1" } },
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("deletes warehouse", async () => {
    const set = {};
    const res = await controller.deleteWarehouseController({
      params: { id: "w1" },
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.deleteWarehouse.calls.length).toBe(1);
  });

  it("returns error when delete fails", async () => {
    const set = {};
    const err = new Error("fail");
    err.statusCode = 409;
    serviceMock.deleteWarehouse.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.deleteWarehouseController({
      params: { id: "w1" },
      set,
    });
    expect(set.status).toBe(409);
    expect(res.error).toBe("fail");
  });

  it("gets warehouse inventory", async () => {
    const set = {};
    const res = await controller.getWarehouseInventoryController({
      params: { id: "w1" },
      query: { lowStock: true },
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getWarehouseInventory.calls[0][0]).toBe("w1");
  });

  it("returns error when get inventory fails", async () => {
    const set = {};
    serviceMock.getWarehouseInventory.mockImplementation(async () => {
      throw new Error("boom");
    });

    const res = await controller.getWarehouseInventoryController({
      params: { id: "w1" },
      query: {},
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });
});
