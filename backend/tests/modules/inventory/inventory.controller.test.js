import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getInventory: createMockFn(async () => ({ inventories: [], pagination: {} })),
  adjustInventory: createMockFn(async () => ({ id: "inv1" })),
  transferInventory: createMockFn(async () => ({ id: "tr1" })),
  getStockMovements: createMockFn(async () => ({ movements: [] })),
};

const loggerMock = { error: createMockFn() };
const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
  createAuditLogData: (store, data) => data,
};

mock.module(
  "../../../src/modules/inventory/inventory.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const controller =
  await import("../../../src/modules/inventory/inventory.controller.js");

describe("modules/inventory/inventory.controller", () => {
  beforeEach(() => {
    serviceMock.getInventory.mockReset();
    serviceMock.getInventory.mockResolvedValue({
      inventories: [],
      pagination: {},
    });
    serviceMock.adjustInventory.mockReset();
    serviceMock.adjustInventory.mockResolvedValue({ id: "inv1" });
    serviceMock.transferInventory.mockReset();
    serviceMock.transferInventory.mockResolvedValue({ id: "tr1" });
    serviceMock.getStockMovements.mockReset();
    serviceMock.getStockMovements.mockResolvedValue({ movements: [] });
    serviceMock.getStockMovements.mockResolvedValue({ movements: [] });
    loggerMock.error.mockReset();
    jobsMock.enqueueAuditLogJob.mockReset();
  });

  const mockStore = {
    user: { id: "u1", businessId: "biz-1" },
    outletId: "out-1",
  };

  it("passes outletId from store to get inventory", async () => {
    const set = {};
    const res = await controller.getInventoryController({
      query: {},
      store: mockStore,
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getInventory.calls[0][0].outletId).toBe("out-1");
    expect(serviceMock.getInventory.calls[0][1]).toBe("biz-1");
  });

  it("passes lowStock filter to get inventory", async () => {
    const set = {};
    await controller.getInventoryController({
      query: { lowStock: "true" },
      store: mockStore,
      set,
    });
    expect(serviceMock.getInventory.calls[0][0].lowStock).toBe(true);
  });

  it("returns error response when get inventory fails", async () => {
    const set = {};
    serviceMock.getInventory.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getInventoryController({
      query: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns error response when adjust fails", async () => {
    const set = {};
    serviceMock.adjustInventory.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.adjustInventoryController({
      body: { productId: "p1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.success).toBe(false);
  });

  it("adjusts inventory successfully", async () => {
    const set = {};
    const res = await controller.adjustInventoryController({
      body: { productId: "p1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.adjustInventory.calls[0][1]).toBe("u1");
    expect(serviceMock.adjustInventory.calls[0][2]).toBe("biz-1");
  });

  it("transfers inventory with outlet from store", async () => {
    const set = {};
    const res = await controller.transferInventoryController({
      body: { fromWarehouseId: "w1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.transferInventory.calls[0][0].outletId).toBe("out-1");
    expect(serviceMock.transferInventory.calls[0][2]).toBe("biz-1");
  });

  it("returns error when transfer fails", async () => {
    const set = {};
    serviceMock.transferInventory.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.transferInventoryController({
      body: { outletId: "out" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("gets stock movements with outlet from store", async () => {
    const set = {};
    const res = await controller.getStockMovementsController({
      query: { outletId: "q" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getStockMovements.calls[0][0].outletId).toBe("out-1");
    expect(serviceMock.getStockMovements.calls[0][1]).toBe("biz-1");
  });

  it("returns error when get stock movements fails", async () => {
    const set = {};
    serviceMock.getStockMovements.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getStockMovementsController({
      query: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });
});
