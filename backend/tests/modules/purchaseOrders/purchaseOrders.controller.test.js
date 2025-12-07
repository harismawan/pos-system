import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getPurchaseOrders: createMockFn(async () => ({ orders: [], pagination: {} })),
  getPurchaseOrderById: createMockFn(async () => ({ id: "po1" })),
  createPurchaseOrder: createMockFn(async () => ({ id: "po1" })),
  updatePurchaseOrder: createMockFn(async () => ({
    id: "po1",
    status: "UPDATED",
  })),
  receivePurchaseOrder: createMockFn(async () => ({
    id: "po1",
    status: "RECEIVED",
  })),
  cancelPurchaseOrder: createMockFn(async () => ({
    id: "po1",
    status: "CANCELLED",
  })),
};

const loggerMock = { error: createMockFn() };

mock.module(
  "../../../src/modules/purchaseOrders/purchaseOrders.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const controller =
  await import("../../../src/modules/purchaseOrders/purchaseOrders.controller.js");

describe("modules/purchaseOrders/purchaseOrders.controller", () => {
  beforeEach(() => {
    serviceMock.getPurchaseOrders.mockReset();
    serviceMock.getPurchaseOrders.mockResolvedValue({
      orders: [],
      pagination: {},
    });
    serviceMock.getPurchaseOrderById.mockReset();
    serviceMock.getPurchaseOrderById.mockResolvedValue({ id: "po1" });
    serviceMock.createPurchaseOrder.mockReset();
    serviceMock.createPurchaseOrder.mockResolvedValue({ id: "po1" });
    serviceMock.updatePurchaseOrder.mockReset();
    serviceMock.updatePurchaseOrder.mockResolvedValue({
      id: "po1",
      status: "UPDATED",
    });
    serviceMock.receivePurchaseOrder.mockReset();
    serviceMock.receivePurchaseOrder.mockResolvedValue({
      id: "po1",
      status: "RECEIVED",
    });
    serviceMock.cancelPurchaseOrder.mockReset();
    serviceMock.cancelPurchaseOrder.mockResolvedValue({
      id: "po1",
      status: "CANCELLED",
    });
    loggerMock.error.mockReset();
  });

  it("returns purchase orders list and prefers outletId from store", async () => {
    const set = {};
    const res = await controller.getPurchaseOrdersController({
      query: { outletId: "q-1" },
      store: { outletId: "store-1" },
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getPurchaseOrders.calls[0][0].outletId).toBe("store-1");
  });

  it("returns error when get purchase orders fails", async () => {
    const set = {};
    serviceMock.getPurchaseOrders.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getPurchaseOrdersController({
      query: {},
      store: {},
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns purchase order by id", async () => {
    const set = {};
    const res = await controller.getPurchaseOrderByIdController({
      params: { id: "po1" },
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe("po1");
  });

  it("returns 404 when purchase order missing", async () => {
    const set = {};
    serviceMock.getPurchaseOrderById.mockImplementation(async () => {
      throw new Error("Purchase order not found");
    });

    const res = await controller.getPurchaseOrderByIdController({
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
    serviceMock.getPurchaseOrderById.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.getPurchaseOrderByIdController({
      params: { id: "po1" },
      set,
    });
    expect(set.status).toBe(410);
    expect(res.error).toBe("gone");
  });

  it("sets 201 on create purchase order", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.createPurchaseOrderController({
      body: {},
      store,
      set,
    });
    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createPurchaseOrder.calls.length).toBeGreaterThan(0);
  });

  it("returns error when create fails with custom status", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const err = new Error("invalid");
    err.statusCode = 422;
    serviceMock.createPurchaseOrder.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.createPurchaseOrderController({
      body: {},
      store,
      set,
    });
    expect(set.status).toBe(422);
    expect(res.error).toBe("invalid");
  });

  it("updates purchase order", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.updatePurchaseOrderController({
      params: { id: "po1" },
      body: { status: "UPDATED" },
      store,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.updatePurchaseOrder.calls[0]).toEqual([
      "po1",
      { status: "UPDATED" },
      "u1",
    ]);
  });

  it("returns error when update fails", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    serviceMock.updatePurchaseOrder.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updatePurchaseOrderController({
      params: { id: "po1" },
      body: {},
      store,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("receives purchase order", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.receivePurchaseOrderController({
      params: { id: "po1" },
      body: { receivedItems: [] },
      store,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.receivePurchaseOrder.calls[0]).toEqual([
      "po1",
      [],
      "u1",
    ]);
  });

  it("returns error when receive fails with status code", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const err = new Error("cannot receive");
    err.statusCode = 409;
    serviceMock.receivePurchaseOrder.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.receivePurchaseOrderController({
      params: { id: "po1" },
      body: { receivedItems: [] },
      store,
      set,
    });

    expect(set.status).toBe(409);
    expect(res.error).toBe("cannot receive");
  });

  it("cancels purchase order", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.cancelPurchaseOrderController({
      params: { id: "po1" },
      store,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.cancelPurchaseOrder.calls[0]).toEqual(["po1", "u1"]);
  });

  it("returns error when cancel fails", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    serviceMock.cancelPurchaseOrder.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.cancelPurchaseOrderController({
      params: { id: "po1" },
      store,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });
});
