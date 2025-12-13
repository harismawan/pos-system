import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../../../tests/mocks/prisma.js";
import { createCacheMock } from "../../../tests/mocks/cache.js";

const prismaMock = createPrismaMock();
const cacheMock = createCacheMock();

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));

// Mock cache module directly - this avoids redis dependency issues
mock.module("../../../src/libs/cache.js", () => cacheMock);

const productsService =
  await import("../../../src/modules/products/products.service.js?v2");

const businessId = "biz-1";

describe("modules/products/products.service", () => {
  beforeEach(() => {
    prismaMock.product.findMany.mockReset?.();
    prismaMock.product.count.mockReset?.();
    prismaMock.product.findUnique.mockReset?.();
    prismaMock.product.create.mockReset?.();
    prismaMock.product.update.mockReset?.();
    prismaMock.inventory.findMany.mockReset?.();
    cacheMock.getCache.mockReset?.();
    cacheMock.setCache.mockReset?.();
    cacheMock.deleteCache.mockReset?.();
    cacheMock.deleteCachePattern.mockReset?.();

    // Default: cache miss
    cacheMock.getCache.mockResolvedValue(null);
  });

  describe("getProducts", () => {
    it("applies search filters and pagination (cache miss)", async () => {
      prismaMock.product.findMany.mockResolvedValue([{ id: "p1" }]);
      prismaMock.product.count.mockResolvedValue(1);

      const result = await productsService.getProducts({
        search: "abc",
        isActive: "true",
        page: 2,
        limit: 5,
        businessId,
      });

      expect(prismaMock.product.findMany.calls.length).toBe(1);
      const args = prismaMock.product.findMany.calls[0][0];
      expect(args.where.isActive).toBe(true);
      expect(args.where.businessId).toBe(businessId);
      expect(args.skip).toBe(5);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.products).toEqual([{ id: "p1" }]);
      // Should cache result
      expect(cacheMock.setCache.calls.length).toBe(1);
    });

    it("returns cached result on cache hit (no outletId)", async () => {
      const cachedData = {
        products: [{ id: "cached-p1" }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      cacheMock.getCache.mockResolvedValue(cachedData);

      const result = await productsService.getProducts({
        search: "test",
        businessId,
      });

      expect(result).toEqual(cachedData);
      // Should not call database
      expect(prismaMock.product.findMany.calls.length).toBe(0);
    });

    it("merges fresh inventory with cached products when outletId provided", async () => {
      const cachedData = {
        products: [{ id: "p1" }, { id: "p2" }],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      };
      cacheMock.getCache.mockResolvedValue(cachedData);
      prismaMock.inventory.findMany.mockResolvedValue([
        { id: "inv1", productId: "p1", quantityOnHand: 10 },
      ]);

      const result = await productsService.getProducts({
        search: "test",
        outletId: "out-1",
        businessId,
      });

      // Should fetch inventory
      expect(prismaMock.inventory.findMany.calls.length).toBe(1);
      // Products should have inventories merged
      expect(result.products[0].inventories).toEqual([
        { id: "inv1", productId: "p1", quantityOnHand: 10 },
      ]);
      expect(result.products[1].inventories).toEqual([]);
    });

    it("fetches fresh inventory when outletId provided (cache miss)", async () => {
      prismaMock.product.findMany.mockResolvedValue([{ id: "p1" }]);
      prismaMock.product.count.mockResolvedValue(1);
      prismaMock.inventory.findMany.mockResolvedValue([
        { id: "inv1", productId: "p1", quantityOnHand: 5 },
      ]);

      const result = await productsService.getProducts({
        category: "Beverage",
        outletId: "out-1",
        businessId,
      });

      const args = prismaMock.product.findMany.calls[0][0];
      expect(args.where.category).toBe("Beverage");
      expect(result.products[0].inventories).toEqual([
        { id: "inv1", productId: "p1", quantityOnHand: 5 },
      ]);
    });
  });

  describe("getProductById", () => {
    it("throws when product is not found (cache miss)", async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);
      prismaMock.inventory.findMany.mockResolvedValue([]);

      await expect(
        productsService.getProductById("missing", businessId),
      ).rejects.toThrow("Product not found");
    });

    it("returns product with fresh inventory (cache miss)", async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: "p1",
        name: "Test Product",
        priceTiers: [],
        businessId,
      });
      prismaMock.inventory.findMany.mockResolvedValue([
        { id: "inv1", productId: "p1", quantityOnHand: 100 },
      ]);

      const product = await productsService.getProductById("p1", businessId);

      expect(product.id).toBe("p1");
      expect(product.inventories).toEqual([
        { id: "inv1", productId: "p1", quantityOnHand: 100 },
      ]);
      // Should cache product
      expect(cacheMock.setCache.calls.length).toBe(1);
    });

    it("returns cached product with fresh inventory (cache hit)", async () => {
      const cachedProduct = {
        id: "p1",
        name: "Cached Product",
        priceTiers: [],
        businessId,
      };
      cacheMock.getCache.mockResolvedValue(cachedProduct);
      prismaMock.inventory.findMany.mockResolvedValue([
        { id: "inv1", productId: "p1", quantityOnHand: 50 },
      ]);

      const product = await productsService.getProductById("p1", businessId);

      expect(product.id).toBe("p1");
      expect(product.name).toBe("Cached Product");
      expect(product.inventories).toEqual([
        { id: "inv1", productId: "p1", quantityOnHand: 50 },
      ]);
      // Should not call database for product
      expect(prismaMock.product.findUnique.calls.length).toBe(0);
    });
  });

  describe("createProduct", () => {
    it("creates product and invalidates list cache", async () => {
      prismaMock.product.create.mockResolvedValue({ id: "new" });

      const product = await productsService.createProduct(
        { name: "Test" },
        businessId,
      );

      expect(product.id).toBe("new");
      expect(prismaMock.product.create.calls[0][0].data.name).toBe("Test");
      expect(prismaMock.product.create.calls[0][0].data.businessId).toBe(
        businessId,
      );
      // Should invalidate list cache
      expect(cacheMock.deleteCachePattern.calls[0][0]).toBe(
        "cache:products:list:*",
      );
    });
  });

  describe("updateProduct", () => {
    it("updates product and invalidates caches", async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: "p1", businessId });
      prismaMock.product.update.mockResolvedValue({
        id: "p1",
        name: "Updated",
      });

      const product = await productsService.updateProduct(
        "p1",
        {
          name: "Updated",
        },
        businessId,
      );

      expect(product.name).toBe("Updated");
      // Should delete specific product cache and list cache pattern
      expect(cacheMock.deleteCache.calls.length).toBe(1);
      expect(cacheMock.deleteCachePattern.calls.length).toBe(1);
    });
  });

  describe("deleteProduct", () => {
    it("soft deletes product and invalidates caches", async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: "p1", businessId });
      prismaMock.product.update.mockResolvedValue({});

      const res = await productsService.deleteProduct("p1", businessId);

      expect(res.message).toMatch(/deactivated/);
      expect(prismaMock.product.update.calls[0][0].data.isActive).toBe(false);
      // Should invalidate caches
      expect(cacheMock.deleteCache.calls.length).toBe(1);
      expect(cacheMock.deleteCachePattern.calls.length).toBe(1);
    });

    it("throws when businessId is missing in deleteProduct", async () => {
      await expect(productsService.deleteProduct("p1", null)).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when deleting product from another business", async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: "p1",
        businessId: "other",
      });
      await expect(
        productsService.deleteProduct("p1", businessId),
      ).rejects.toThrow("Product not found");
    });
  });

  describe("Validation", () => {
    it("throws when businessId is missing in getProducts", async () => {
      await expect(productsService.getProducts({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when businessId is missing in getProductById", async () => {
      await expect(productsService.getProductById("p1", null)).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when cached product belongs to another business", async () => {
      cacheMock.getCache.mockResolvedValue({ id: "p1", businessId: "other" });
      await expect(
        productsService.getProductById("p1", businessId),
      ).rejects.toThrow("Product not found");
    });

    it("throws when product belongs to another business (cache miss)", async () => {
      cacheMock.getCache.mockResolvedValue(null);
      prismaMock.product.findUnique.mockResolvedValue({
        id: "p1",
        businessId: "other",
      });
      await expect(
        productsService.getProductById("p1", businessId),
      ).rejects.toThrow("Product not found");
    });

    it("throws when businessId is missing in createProduct", async () => {
      await expect(productsService.createProduct({}, null)).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when businessId is missing in updateProduct", async () => {
      await expect(
        productsService.updateProduct("p1", {}, null),
      ).rejects.toThrow("businessId is required");
    });

    it("throws when updating product from another business", async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: "p1",
        businessId: "other",
      });
      await expect(
        productsService.updateProduct("p1", {}, businessId),
      ).rejects.toThrow("Product not found");
    });
  });
});
