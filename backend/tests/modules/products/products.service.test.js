import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../../../tests/mocks/prisma.js";

const prismaMock = createPrismaMock();

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));

const productsService =
  await import("../../../src/modules/products/products.service.js?controllers");

describe("modules/products/products.service", () => {
  beforeEach(() => {
    prismaMock.product.findMany.mockReset?.();
    prismaMock.product.count.mockReset?.();
    prismaMock.product.findUnique.mockReset?.();
    prismaMock.product.create.mockReset?.();
    prismaMock.product.update.mockReset?.();
  });

  it("applies search filters and pagination", async () => {
    let findManyCalled = false;
    prismaMock.product.findMany.mockImplementation(async () => {
      findManyCalled = true;
      return [{ id: "p1" }];
    });
    prismaMock.product.count.mockImplementation(async () => 1);

    const result = await productsService.getProducts({
      search: "abc",
      isActive: "true",
      page: 2,
      limit: 5,
    });

    expect(findManyCalled).toBe(true);
    const args = prismaMock.product.findMany.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.skip).toBe(5);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.products).toEqual([{ id: "p1" }]);
  });

  it("applies outlet and category filters and converts inactive flag", async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: "p2" }]);
    prismaMock.product.count.mockResolvedValue(1);

    const result = await productsService.getProducts({
      category: "Beverage",
      isActive: "false",
      outletId: "out-1",
    });

    const args = prismaMock.product.findMany.calls[0][0];
    expect(args.where.category).toBe("Beverage");
    expect(args.where.isActive).toBe(false);
    expect(args.include.inventories.where.warehouse.outletId).toBe("out-1");
    expect(result.products[0].id).toBe("p2");
  });

  it("throws when product is not found", async () => {
    prismaMock.product.findUnique.mockImplementation(async () => null);

    await expect(productsService.getProductById("missing")).rejects.toThrow(
      "Product not found",
    );
  });

  it("returns product with related data", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p1",
      inventories: [],
    });

    const product = await productsService.getProductById("p1");

    expect(product.id).toBe("p1");
    const args = prismaMock.product.findUnique.calls[0][0];
    expect(args.include.priceTiers.include.priceTier).toBe(true);
  });

  it("creates product", async () => {
    prismaMock.product.create.mockResolvedValue({ id: "new" });

    const product = await productsService.createProduct({ name: "Test" });

    expect(product.id).toBe("new");
    expect(prismaMock.product.create.calls[0][0].data.name).toBe("Test");
  });

  it("updates product", async () => {
    prismaMock.product.update.mockResolvedValue({ id: "p1", name: "Updated" });

    const product = await productsService.updateProduct("p1", {
      name: "Updated",
    });

    expect(product.name).toBe("Updated");
    expect(prismaMock.product.update.calls[0][0].where.id).toBe("p1");
  });

  it("soft deletes product by marking inactive", async () => {
    prismaMock.product.update.mockResolvedValue({});

    const res = await productsService.deleteProduct("p1");

    expect(res.message).toMatch(/deactivated/);
    expect(prismaMock.product.update.calls[0][0].data.isActive).toBe(false);
  });
});
