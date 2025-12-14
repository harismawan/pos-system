import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  createPosOrder: createMockFn(async () => ({
    id: "o1",
    outletId: "store-1",
    orderNumber: "123",
    totalAmount: 100,
    items: [],
  })),
  getPosOrderById: createMockFn(async () => ({ id: "o1" })),
  completePosOrder: createMockFn(async () => ({
    id: "o1",
    status: "COMPLETED",
    outletId: "store-1",
    orderNumber: "123",
    totalAmount: 100,
    items: [],
  })),
  getPosOrders: createMockFn(async () => ({ orders: [], pagination: {} })),
  cancelPosOrder: createMockFn(async () => ({
    id: "o1",
    status: "CANCELLED",
    outletId: "store-1",
    orderNumber: "123",
  })),
  addPayment: createMockFn(async () => ({
    id: "pay-1",
    outletId: "store-1",
    orderNumber: "123",
  })),
};

const loggerMock = { error: createMockFn() };
const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
  createAuditLogData: (s, p) => p,
};

mock.module("../../../src/modules/sales/sales.service.js", () => serviceMock);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const controller =
  await import("../../../src/modules/sales/sales.controller.js");

describe("modules/sales/sales.controller", () => {
  beforeEach(() => {
    serviceMock.createPosOrder.mockReset();
    serviceMock.createPosOrder.mockResolvedValue({
      id: "o1",
      outletId: "store-1",
      orderNumber: "123",
      totalAmount: 100,
      items: [],
    });
    serviceMock.getPosOrders.mockReset();
    serviceMock.getPosOrders.mockResolvedValue({ orders: [], pagination: {} });
    serviceMock.getPosOrderById.mockReset();
    serviceMock.getPosOrderById.mockResolvedValue({ id: "o1" });
    serviceMock.completePosOrder.mockReset();
    serviceMock.completePosOrder.mockResolvedValue({
      id: "o1",
      status: "COMPLETED",
      outletId: "store-1",
      orderNumber: "123",
      totalAmount: 100,
      items: [],
    });
    serviceMock.cancelPosOrder.mockReset();
    serviceMock.cancelPosOrder.mockResolvedValue({
      id: "o1",
      status: "CANCELLED",
      outletId: "store-1",
      orderNumber: "123",
    });
    serviceMock.addPayment.mockReset();
    serviceMock.addPayment.mockResolvedValue({
      id: "pay-1",
      outletId: "store-1",
      orderNumber: "123",
    });
    loggerMock.error.mockReset();
    jobsMock.enqueueAuditLogJob.mockReset();
  });

  const mockStore = {
    user: { id: "u1", businessId: "biz-1" },
    outletId: "store-1",
  };

  it("returns POS orders list and prefers outletId from store", async () => {
    const set = {};
    const res = await controller.getPosOrdersController({
      query: { outletId: "q-1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getPosOrders.calls[0][0].outletId).toBe("store-1");
    expect(serviceMock.getPosOrders.calls[0][1]).toBe("biz-1");
  });

  it("returns error when list fails", async () => {
    const set = {};
    serviceMock.getPosOrders.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getPosOrdersController({
      query: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("sets 201 when creating POS order", async () => {
    const set = {};
    const res = await controller.createPosOrderController({
      body: {},
      store: mockStore,
      set,
    });

    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createPosOrder.calls.length).toBeGreaterThan(0);
    expect(serviceMock.createPosOrder.calls[0][2]).toBe("biz-1");
  });

  it("returns error when create fails with status code", async () => {
    const set = {};
    const err = new Error("bad data");
    err.statusCode = 422;
    serviceMock.createPosOrder.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.createPosOrderController({
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(422);
    expect(res.error).toBe("bad data");
  });

  it("returns POS order by id", async () => {
    const set = {};
    const res = await controller.getPosOrderByIdController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe("o1");
    expect(serviceMock.getPosOrderById.calls[0][1]).toBe("biz-1");
  });

  it("returns 404 when order is missing", async () => {
    const set = {};
    serviceMock.getPosOrderById.mockImplementation(async () => {
      throw new Error("Order not found");
    });

    const res = await controller.getPosOrderByIdController({
      params: { id: "missing" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(404);
    expect(res.success).toBe(false);

    serviceMock.getPosOrderById.mockImplementation(async () => ({ id: "o1" }));
  });

  it("returns 500 and internal message when get by id fails otherwise", async () => {
    const set = {};
    serviceMock.getPosOrderById.mockImplementation(async () => {
      throw new Error("db down");
    });

    const res = await controller.getPosOrderByIdController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("handles completion errors with 400 status", async () => {
    const set = {};
    serviceMock.completePosOrder.mockImplementation(async () => {
      throw new Error("cannot complete");
    });

    const res = await controller.completePosOrderController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(400);
    expect(res.success).toBe(false);

    serviceMock.completePosOrder.mockImplementation(async () => ({
      id: "o1",
      status: "COMPLETED",
      outletId: "store-1",
      orderNumber: "123",
      totalAmount: 100,
      items: [],
    }));
  });

  it("completes POS order successfully", async () => {
    const set = {};
    const res = await controller.completePosOrderController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.completePosOrder.calls[0]).toEqual([
      "o1",
      "u1",
      "biz-1",
    ]);
  });

  it("cancels POS order", async () => {
    const set = {};
    const res = await controller.cancelPosOrderController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.cancelPosOrder.calls[0]).toEqual(["o1", "u1", "biz-1"]);
  });

  it("returns error when cancel fails", async () => {
    const set = {};
    serviceMock.cancelPosOrder.mockImplementation(async () => {
      throw new Error("cannot cancel");
    });

    const res = await controller.cancelPosOrderController({
      params: { id: "o1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(400);
    expect(res.success).toBe(false);
  });

  it("adds payment with 201", async () => {
    const set = {};
    const res = await controller.addPaymentController({
      params: { id: "o1" },
      body: { amount: 10 },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.addPayment.calls[0][0]).toBe("o1");
    expect(serviceMock.addPayment.calls[0][2]).toBe("biz-1");
  });

  it("returns error when add payment fails", async () => {
    const set = {};
    serviceMock.addPayment.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.addPaymentController({
      params: { id: "o1" },
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(400);
    expect(res.error).toBe("fail");
  });
});
