import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  getProductById: createMockFn(async () => ({ id: "p1" })),
  getProducts: createMockFn(async () => ({ products: [], pagination: {} })),
  createProduct: createMockFn(async () => ({ id: "p1" })),
  updateProduct: createMockFn(async () => ({ id: "p1", name: "updated" })),
  deleteProduct: createMockFn(async () => ({ deleted: true })),
};

const loggerMock = { error: createMockFn() };

mock.module(
  "../../../src/modules/products/products.service.js",
  () => serviceMock,
);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const controller =
  await import("../../../src/modules/products/products.controller.js");

const resetMocks = () => {
  serviceMock.getProducts.mockReset();
  serviceMock.getProducts.mockResolvedValue({ products: [], pagination: {} });
  serviceMock.getProductById.mockReset();
  serviceMock.getProductById.mockResolvedValue({ id: "p1" });
  serviceMock.createProduct.mockReset();
  serviceMock.createProduct.mockResolvedValue({ id: "p1" });
  serviceMock.updateProduct.mockReset();
  serviceMock.updateProduct.mockResolvedValue({ id: "p1", name: "updated" });
  serviceMock.deleteProduct.mockReset();
  serviceMock.deleteProduct.mockResolvedValue({ deleted: true });
  loggerMock.error.mockReset();
};

const mockStore = {
  user: { id: "u1", businessId: "biz-1" },
  outletId: "store-1",
};

describe("modules/products/products.controller", () => {
  beforeEach(resetMocks);

  it("returns products list and prefers outletId from store", async () => {
    const set = {};
    const res = await controller.getProductsController({
      query: { search: "abc", outletId: "q-1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.getProducts.calls[0][0].outletId).toBe("store-1");
    expect(serviceMock.getProducts.calls[0][0].businessId).toBe("biz-1");
  });

  it("returns error when get products fails", async () => {
    const set = {};
    serviceMock.getProducts.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.getProductsController({
      query: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.success).toBe(false);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns product by id", async () => {
    const set = {};
    const res = await controller.getProductByIdController({
      params: { id: "p1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe("p1");
    expect(serviceMock.getProductById.calls[0][1]).toBe("biz-1");
  });

  it("returns 404 when product is missing", async () => {
    const set = {};
    serviceMock.getProductById.mockImplementation(async () => {
      throw new Error("Product not found");
    });

    const res = await controller.getProductByIdController({
      params: { id: "missing" },
      store: mockStore,
      set,
    });

    expect(set.status).toBe(404);
    expect(res.success).toBe(false);
  });

  it("sets 201 on create", async () => {
    const set = {};
    const res = await controller.createProductController({
      body: { name: "Test" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(201);
    expect(res.success).toBe(true);
    expect(serviceMock.createProduct.calls.length).toBeGreaterThan(0);
    expect(serviceMock.createProduct.calls[0][1]).toBe("biz-1");
  });

  it("returns error when create fails", async () => {
    const set = {};
    serviceMock.createProduct.mockImplementation(async () => {
      throw new Error("boom");
    });

    const res = await controller.createProductController({
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(400);
    expect(res.success).toBe(false);
  });

  it("uses provided status code when get product fails", async () => {
    const set = {};
    const error = new Error("boom");
    error.statusCode = 418;
    serviceMock.getProductById.mockImplementation(async () => {
      throw error;
    });

    const res = await controller.getProductByIdController({
      params: { id: "p1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(418);
    expect(res.success).toBe(false);
    expect(res.error).toBe("boom");
  });

  it("updates product successfully", async () => {
    const set = {};
    const res = await controller.updateProductController({
      params: { id: "p1" },
      body: { name: "New" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.updateProduct.calls.length).toBe(1);
    expect(serviceMock.updateProduct.calls[0][2]).toBe("biz-1");
  });

  it("returns error when update fails", async () => {
    const set = {};
    serviceMock.updateProduct.mockImplementation(async () => {
      throw new Error("fail");
    });

    const res = await controller.updateProductController({
      params: { id: "p1" },
      body: {},
      store: mockStore,
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("deletes product successfully", async () => {
    const set = {};
    const res = await controller.deleteProductController({
      params: { id: "p1" },
      store: mockStore,
      set,
    });

    expect(res.success).toBe(true);
    expect(serviceMock.deleteProduct.calls.length).toBe(1);
    expect(serviceMock.deleteProduct.calls[0][1]).toBe("biz-1");
  });

  it("returns error when delete fails with custom status", async () => {
    const set = {};
    const err = new Error("conflict");
    err.statusCode = 409;
    serviceMock.deleteProduct.mockImplementation(async () => {
      throw err;
    });

    const res = await controller.deleteProductController({
      params: { id: "p1" },
      store: mockStore,
      set,
    });
    expect(set.status).toBe(409);
    expect(res.success).toBe(false);
    expect(res.error).toBe("conflict");
  });
});
