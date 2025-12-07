import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  createPosOrder: createMockFn(async () => ({ id: "o1" })),
  getPosOrderById: createMockFn(async () => ({ id: "o1" })),
  completePosOrder: createMockFn(async () => ({
    id: "o1",
    status: "COMPLETED",
  })),
  getPosOrders: createMockFn(async () => ({ orders: [], pagination: {} })),
  cancelPosOrder: createMockFn(async () => ({ id: "o1", status: "CANCELLED" })),
  addPayment: createMockFn(async () => ({ id: "pay-1" })),
};

const loggerMock = { error: createMockFn() };

mock.module("../../../src/modules/sales/sales.service.js", () => serviceMock);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const controller =
  await import("../../../src/modules/sales/sales.controller.js");

describe("modules/sales/sales.controller", () => {
  beforeEach(() => {
    serviceMock.createPosOrder.mockReset();
    serviceMock.createPosOrder.mockResolvedValue({ id: "o1" });
    serviceMock.getPosOrders.mockReset();
    serviceMock.getPosOrders.mockResolvedValue({ orders: [], pagination: {} });
    serviceMock.getPosOrderById.mockReset();
    serviceMock.getPosOrderById.mockResolvedValue({ id: "o1" });
    serviceMock.completePosOrder.mockReset();
    serviceMock.completePosOrder.mockResolvedValue({
      id: "o1",
      status: "COMPLETED",
    });
    serviceMock.cancelPosOrder.mockReset();
    serviceMock.cancelPosOrder.mockResolvedValue({
      id: "o1",
      status: "CANCELLED",
    });
    serviceMock.addPayment.mockReset();
    serviceMock.addPayment.mockResolvedValue({ id: "pay-1" });
    loggerMock.error.mockReset();
  });

  it("returns POS orders list and prefers outletId from store", async () => {
    const set = {};
    const res = await controller.getPosOrdersController({
      query: { outletId: "q-1" },
      store: { outletId: "store-1" },
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getPosOrders.calls[0][0].outletId).toBe("store-1");
  });

  it("returns error when list fails", async () => {
    const set = {};
    serviceMock.getPosOrders.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getPosOrdersController({
      query: {},
      store: {},
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("sets 201 when creating POS order", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.createPosOrderController({
      body: {},
      store,
      set,
    });

    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createPosOrder.calls.length).toBeGreaterThan(0);
  });

  it("returns error when create fails with status code", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const err = new Error("bad data");
    err.statusCode = 422;
    serviceMock.createPosOrder.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.createPosOrderController({
      body: {},
      store,
      set,
    });
    expect(set.status).toBe(422);
    expect(res.error).toBe("bad data");
  });

  it("returns POS order by id", async () => {
    const set = {};
    const res = await controller.getPosOrderByIdController({
      params: { id: "o1" },
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe("o1");
  });

  it("returns 404 when order is missing", async () => {
    const set = {};
    serviceMock.getPosOrderById.mockImplementation(async () => {
      throw new Error("Order not found");
    });

    const res = await controller.getPosOrderByIdController({
      params: { id: "missing" },
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
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("handles completion errors with 400 status", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    serviceMock.completePosOrder.mockImplementation(async () => {
      throw new Error("cannot complete");
    });

    const res = await controller.completePosOrderController({
      params: { id: "o1" },
      store,
      set,
    });

    expect(set.status).toBe(400);
    expect(res.success).toBe(false);

    serviceMock.completePosOrder.mockImplementation(async () => ({
      id: "o1",
      status: "COMPLETED",
    }));
  });

  it("completes POS order successfully", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.completePosOrderController({
      params: { id: "o1" },
      store,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.completePosOrder.calls[0]).toEqual(["o1", "u1"]);
  });

  it("cancels POS order", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    const res = await controller.cancelPosOrderController({
      params: { id: "o1" },
      store,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.cancelPosOrder.calls[0]).toEqual(["o1", "u1"]);
  });

  it("returns error when cancel fails", async () => {
    const set = {};
    const store = { user: { id: "u1" } };
    serviceMock.cancelPosOrder.mockImplementation(async () => {
      throw new Error("cannot cancel");
    });

    const res = await controller.cancelPosOrderController({
      params: { id: "o1" },
      store,
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
      set,
    });

    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.addPayment.calls[0][0]).toBe("o1");
  });

  it("returns error when add payment fails", async () => {
    const set = {};
    serviceMock.addPayment.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.addPaymentController({
      params: { id: "o1" },
      body: {},
      set,
    });
    expect(set.status).toBe(400);
    expect(res.error).toBe("fail");
  });
});
