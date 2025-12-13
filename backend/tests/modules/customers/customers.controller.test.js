import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getCustomers: createMockFn(async () => ({ customers: [], pagination: {} })),
  getCustomerById: createMockFn(async () => ({ id: "c1" })),
  createCustomer: createMockFn(async () => ({ id: "c1" })),
  updateCustomer: createMockFn(async () => ({ id: "c1" })),
  deleteCustomer: createMockFn(async () => ({ id: "c1" })),
};

const loggerMock = { error: createMockFn() };

mock.module(
  "../../../src/modules/customers/customers.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const controller =
  await import("../../../src/modules/customers/customers.controller.js");

const mockStore = {
  user: { id: "u1", businessId: "biz-1" },
  outletId: "out-1",
};

describe("modules/customers/customers.controller", () => {
  beforeEach(() => {
    serviceMock.getCustomers.mockReset();
    serviceMock.getCustomers.mockResolvedValue({
      customers: [],
      pagination: {},
    });
    serviceMock.getCustomerById.mockReset();
    serviceMock.getCustomerById.mockResolvedValue({ id: "c1" });
    serviceMock.createCustomer.mockReset();
    serviceMock.createCustomer.mockResolvedValue({ id: "c1" });
    serviceMock.updateCustomer.mockReset();
    serviceMock.updateCustomer.mockResolvedValue({ id: "c1" });
    serviceMock.deleteCustomer.mockReset();
    serviceMock.deleteCustomer.mockResolvedValue({ id: "c1" });
    loggerMock.error.mockReset();
  });

  it("returns success response for listing customers", async () => {
    const set = {};
    const res = await controller.getCustomersController({
      query: { search: "a" },
      store: mockStore,
      set,
    });
    expect(res.success).toBe(true);
    expect(serviceMock.getCustomers.calls[0][0].search).toBe("a");
    expect(serviceMock.getCustomers.calls[0][0].businessId).toBe("biz-1");
  });

  it("returns error when list customers fails", async () => {
    const set = {};
    serviceMock.getCustomers.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getCustomersController({
      query: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns customer by id", async () => {
    const set = {};
    const res = await controller.getCustomerByIdController({
      params: { id: "c1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getCustomerById.calls[0][0]).toBe("c1");
    expect(serviceMock.getCustomerById.calls[0][1]).toBe("biz-1");
  });

  it("sets 404 when service throws not found", async () => {
    const set = {};
    serviceMock.getCustomerById.mockImplementation(async () => {
      throw new Error("Customer not found");
    });

    const res = await controller.getCustomerByIdController({
      params: { id: "missing" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(404);
    expect(res.success).toBe(false);
  });

  it("uses provided status on get by id failure", async () => {
    const set = {};
    const err = new Error("gone");
    err.statusCode = 410;
    serviceMock.getCustomerById.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.getCustomerByIdController({
      params: { id: "c1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(410);
    expect(res.error).toBe("gone");
  });

  it("sets 201 when creating customer succeeds", async () => {
    const set = {};
    const res = await controller.createCustomerController({
      body: { name: "New" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createCustomer.calls[0][0].name).toBe("New");
    expect(serviceMock.createCustomer.calls[0][1]).toBe("biz-1");
  });

  it("returns error when create fails with status code", async () => {
    const set = {};
    const err = new Error("invalid");
    err.statusCode = 422;
    serviceMock.createCustomer.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.createCustomerController({
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(422);
    expect(res.error).toBe("invalid");
  });

  it("updates customer successfully", async () => {
    const set = {};
    const res = await controller.updateCustomerController({
      params: { id: "c1" },
      body: { name: "New" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.updateCustomer.calls[0][0]).toBe("c1");
    expect(serviceMock.updateCustomer.calls[0][1].name).toBe("New");
    expect(serviceMock.updateCustomer.calls[0][2]).toBe("biz-1");
  });

  it("returns error when update fails", async () => {
    const set = {};
    serviceMock.updateCustomer.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updateCustomerController({
      params: { id: "c1" },
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns error when delete fails", async () => {
    const set = {};
    serviceMock.deleteCustomer.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.deleteCustomerController({
      params: { id: "c1" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(500);
    expect(res.success).toBe(false);
  });

  it("deletes customer successfully", async () => {
    const set = {};
    const res = await controller.deleteCustomerController({
      params: { id: "c1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.deleteCustomer.calls[0][0]).toBe("c1");
    expect(serviceMock.deleteCustomer.calls[0][1]).toBe("biz-1");
  });
});
