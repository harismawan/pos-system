import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { resolve } from "path";
import { createPrismaMock } from "../../mocks/prisma.js";

const prismaMock = createPrismaMock();

// Mock using absolute path to ensure we intercept the service's import
mock.module(resolve(import.meta.dir, "../../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));

// Mock cache functions - always return null to simulate cache miss
mock.module("../../../src/libs/cache.js", () => ({
  wrapWithCache: async (key, ttl, fetchFn) => fetchFn(),
  hashObject: (obj) => "mock-hash",
  CACHE_KEYS: {
    REPORT_SALES_TREND: (hash) => `cache:report:trend:${hash}`,
    REPORT_HEATMAP: (hash) => `cache:report:heatmap:${hash}`,
    REPORT_TOP_PRODUCTS: (hash) => `cache:report:topproducts:${hash}`,
    REPORT_INVENTORY: (hash) => `cache:report:inventory:${hash}`,
    REPORT_STOCK_MOVEMENTS: (hash) => `cache:report:stockmovements:${hash}`,
  },
  CACHE_TTL: {
    REPORT_SUMMARY: 300,
    REPORT_TREND: 600,
    REPORT_HEATMAP: 900,
    REPORT_TOP_PRODUCTS: 300,
  },
}));

const reportsService =
  await import("../../../src/modules/reports/reports.service.js");

const businessId = "biz-1";

describe("modules/reports/reports.service", () => {
  beforeEach(() => {
    prismaMock.posOrder.findMany.mockReset?.();
    prismaMock.posOrder.count.mockReset?.();
    prismaMock.posOrderItem.findMany.mockReset?.();
    prismaMock.inventory.findMany.mockReset?.();
    prismaMock.stockMovement.findMany.mockReset?.();
    prismaMock.stockMovement.count.mockReset?.();
    prismaMock.stockMovement.groupBy?.mockReset?.();
    prismaMock.outlet.findUnique?.mockReset?.();

    // Default mock for outlet validation
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "out-1",
      businessId: businessId, // Ensure outlet belongs to business
    });
  });

  describe("getTopProducts", () => {
    it("aggregates top products by quantity", async () => {
      prismaMock.posOrderItem.findMany.mockImplementation(async () => [
        {
          productId: "p1",
          quantity: 2,
          lineTotal: 20,
          product: { id: "p1", name: "A", sku: "A", category: null },
          posOrder: { status: "COMPLETED" },
        },
        {
          productId: "p1",
          quantity: 1,
          lineTotal: 10,
          product: { id: "p1", name: "A", sku: "A", category: null },
          posOrder: { status: "COMPLETED" },
        },
        {
          productId: "p2",
          quantity: 5,
          lineTotal: 50,
          product: { id: "p2", name: "B", sku: "B", category: null },
          posOrder: { status: "COMPLETED" },
        },
      ]);

      const result = await reportsService.getTopProducts(
        {
          sortBy: "quantity",
        },
        businessId,
      );

      expect(result.products[0].product.id).toBe("p2");
      expect(result.products[0].totalQuantity).toBe(5);
    });

    it("applies filters and sorts top products by revenue with limit", async () => {
      prismaMock.posOrderItem.findMany.mockResolvedValue([
        {
          productId: "p1",
          quantity: 1,
          lineTotal: 10,
          product: { id: "p1", name: "A", sku: "A", category: null },
        },
        {
          productId: "p2",
          quantity: 1,
          lineTotal: 20,
          product: { id: "p2", name: "B", sku: "B", category: null },
        },
      ]);

      const res = await reportsService.getTopProducts(
        {
          outletId: "out-1",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          limit: 1,
        },
        businessId,
      );

      const args = prismaMock.posOrderItem.findMany.calls[0][0];
      expect(args.where.posOrder.outletId).toBe("out-1");
      expect(args.where.posOrder.createdAt.gte).toEqual(new Date("2024-01-01"));
      expect(res.products).toHaveLength(1);
      expect(res.products[0].product.id).toBe("p2");
    });
  });

  describe("getInventoryValuation", () => {
    it("calculates inventory valuation and low stock", async () => {
      prismaMock.inventory.findMany.mockResolvedValue([
        {
          product: {
            id: "p1",
            name: "A",
            sku: "A",
            category: "Food",
            costPrice: 2,
            basePrice: 5,
          },
          warehouse: { id: "w1", name: "Main", code: "M1" },
          quantityOnHand: 3,
          minimumStock: 2,
        },
        {
          product: {
            id: "p2",
            name: "B",
            sku: "B",
            category: "Other",
            costPrice: 1,
            basePrice: 2,
          },
          warehouse: { id: "w1", name: "Main", code: "M1" },
          quantityOnHand: 1,
          minimumStock: 2,
        },
      ]);

      const res = await reportsService.getInventoryValuation(
        {
          warehouseId: "w1",
          category: "Food",
        },
        businessId,
      );

      const args = prismaMock.inventory.findMany.calls[0][0];
      expect(args.where.warehouseId).toBe("w1");
      expect(res.items).toHaveLength(1);
      expect(res.summary.lowStockCount).toBe(0);
      expect(res.summary.totalRetailValue).toBe(15);
    });

    it("returns all items when no category filter", async () => {
      prismaMock.inventory.findMany.mockResolvedValue([
        {
          product: {
            id: "p1",
            name: "A",
            sku: "A",
            category: "Food",
            costPrice: 2,
            basePrice: 5,
          },
          warehouse: { id: "w1", name: "Main", code: "M1" },
          quantityOnHand: 1,
          minimumStock: 5,
        },
      ]);

      const res = await reportsService.getInventoryValuation({}, businessId);

      expect(res.items).toHaveLength(1);
      expect(res.summary.lowStockCount).toBe(1);
    });
  });

  describe("getStockMovementReport", () => {
    it("fetches stock movements with filters and summary", async () => {
      prismaMock.stockMovement.findMany.mockResolvedValue([
        { id: "m1", type: "PURCHASE", quantity: 2 },
      ]);
      prismaMock.stockMovement.count.mockResolvedValue(1);
      prismaMock.stockMovement.groupBy.mockResolvedValue([
        { type: "PURCHASE", _count: 1, _sum: { quantity: 2 } },
      ]);

      const res = await reportsService.getStockMovementReport(
        {
          outletId: "out-1",
          warehouseId: "w1",
          type: "PURCHASE",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          page: 2,
          limit: 1,
        },
        businessId,
      );

      const args = prismaMock.stockMovement.findMany.calls[0][0];
      expect(args.where.outletId).toBe("out-1");
      expect(args.where.OR[0].fromWarehouseId).toBe("w1");
      expect(args.skip).toBe(1);
      expect(res.summary[0]).toEqual({
        type: "PURCHASE",
        count: 1,
        totalQuantity: 2,
      });
      expect(res.pagination.totalPages).toBe(1);
    });
  });

  describe("getOrderHistory", () => {
    it("returns order history with pagination and filters", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([{ id: "o1" }]);
      prismaMock.posOrder.count.mockResolvedValue(1);

      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "out-1",
        businessId,
      });
      prismaMock.customer.findUnique.mockResolvedValue({
        id: "c1",
        businessId,
      });

      const res = await reportsService.getOrderHistory(
        {
          outletId: "out-1",
          status: "COMPLETED",
          customerId: "c1",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          page: 3,
          limit: 5,
        },
        businessId,
      );

      const args = prismaMock.posOrder.findMany.calls[0][0];
      expect(args.where.customerId).toBe("c1");
      expect(args.skip).toBe(10);
      expect(res.pagination.totalPages).toBe(1);
      expect(res.orders[0].id).toBe("o1");
    });
  });

  describe("getSalesTrend", () => {
    it("returns sales trend with period comparison", async () => {
      const currentOrders = [
        {
          totalAmount: 100,
          createdAt: "2024-01-15T10:00:00.000Z",
          items: [{ quantity: 2 }],
        },
      ];
      const previousOrders = [
        {
          totalAmount: 80,
          createdAt: "2024-01-08T10:00:00.000Z",
          items: [{ quantity: 1 }],
        },
      ];

      let callCount = 0;
      prismaMock.posOrder.findMany.mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? currentOrders : previousOrders;
      });

      const res = await reportsService.getSalesTrend(
        {
          startDate: "2024-01-14",
          endDate: "2024-01-21",
          compareWithPrevious: true,
        },
        businessId,
      );

      expect(res.current.totals.revenue).toBe(100);
      expect(res.current.totals.orders).toBe(1);
      expect(res.previous.totals.revenue).toBe(80);
      expect(res.comparison.revenueChange).toBe(25); // 25% increase
    });

    it("returns trend without comparison when disabled", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([
        {
          totalAmount: 100,
          createdAt: "2024-01-15T10:00:00.000Z",
          items: [{ quantity: 2 }],
        },
      ]);

      const res = await reportsService.getSalesTrend(
        {
          startDate: "2024-01-14",
          endDate: "2024-01-21",
          compareWithPrevious: false,
        },
        businessId,
      );

      expect(res.current.totals.revenue).toBe(100);
      expect(res.previous).toBeNull();
      expect(res.comparison).toBeNull();
    });

    it("handles zero previous revenue correctly", async () => {
      let callCount = 0;
      prismaMock.posOrder.findMany.mockImplementation(async () => {
        callCount++;
        return callCount === 1
          ? [
              {
                totalAmount: 100,
                createdAt: "2024-01-15T10:00:00.000Z",
                items: [{ quantity: 1 }],
              },
            ]
          : [];
      });

      const res = await reportsService.getSalesTrend(
        {
          startDate: "2024-01-14",
          endDate: "2024-01-21",
        },
        businessId,
      );

      expect(res.comparison.revenueChange).toBe(100);
    });

    it("groups sales by week", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([
        {
          totalAmount: 100,
          totalDiscountAmount: 5,
          totalTaxAmount: 10,
          createdAt: "2024-01-15T10:00:00.000Z", // Monday
          items: [{ quantity: 2 }],
        },
        {
          totalAmount: 50,
          totalDiscountAmount: 2,
          totalTaxAmount: 5,
          createdAt: "2024-01-17T10:00:00.000Z", // Wednesday (same week)
          items: [{ quantity: 1 }],
        },
      ]);

      const res = await reportsService.getSalesTrend(
        {
          startDate: "2024-01-14",
          endDate: "2024-01-21",
          groupBy: "week",
          compareWithPrevious: false,
        },
        businessId,
      );

      // Both orders should be grouped in the same week starting Sunday 2024-01-14
      expect(res.current.data.length).toBe(1);
      expect(res.current.data[0].date).toBe("2024-01-14");
      expect(res.current.data[0].revenue).toBe(150);
      expect(res.current.totals.revenue).toBe(150);
    });

    it("groups sales by month", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([
        {
          totalAmount: 100,
          totalDiscountAmount: 5,
          totalTaxAmount: 10,
          createdAt: "2024-01-15T10:00:00.000Z",
          items: [{ quantity: 2 }],
        },
        {
          totalAmount: 50,
          totalDiscountAmount: 2,
          totalTaxAmount: 5,
          createdAt: "2024-01-25T10:00:00.000Z",
          items: [{ quantity: 1 }],
        },
      ]);

      const res = await reportsService.getSalesTrend(
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          groupBy: "month",
          compareWithPrevious: false,
        },
        businessId,
      );

      // Both orders should be grouped in the same month
      expect(res.current.data.length).toBe(1);
      expect(res.current.data[0].date).toBe("2024-01");
      expect(res.current.data[0].revenue).toBe(150);
      expect(res.current.totals.revenue).toBe(150);
    });

    it("falls back to daily grouping on unknown interval", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([
        {
          totalAmount: 100,
          totalDiscountAmount: 5,
          totalTaxAmount: 10,
          createdAt: "2024-01-15T10:00:00.000Z",
          items: [{ quantity: 2 }],
        },
        {
          totalAmount: 200,
          totalDiscountAmount: 0,
          totalTaxAmount: 20,
          createdAt: "2024-01-16T10:00:00.000Z", // Next day
          items: [{ quantity: 1 }],
        },
      ]);

      const res = await reportsService.getSalesTrend(
        {
          startDate: "2024-01-14",
          endDate: "2024-01-21",
          groupBy: "unknown",
          compareWithPrevious: false,
        },
        businessId,
      );

      // Should default to daily grouping, producing 2 groups
      // This ensures the sort callback ((a, b) => ...) is executed
      expect(res.current.data.length).toBe(2);
      expect(res.current.data[0].date).toBe("2024-01-15");
      expect(res.current.data[1].date).toBe("2024-01-16");
    });

    it("applies outlet filter in getSalesTrend", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([]);
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "out-1",
        businessId,
      });

      await reportsService.getSalesTrend({ outletId: "out-1" }, businessId);

      const args = prismaMock.posOrder.findMany.calls[0][0];
      expect(args.where.outletId).toBe("out-1");
    });
  });

  describe("getHourlySalesHeatmap", () => {
    it("returns heatmap with peak hours", async () => {
      // Create orders at different times
      prismaMock.posOrder.findMany.mockResolvedValue([
        { totalAmount: 100, createdAt: "2024-01-15T10:00:00.000Z" }, // Monday 10am
        { totalAmount: 50, createdAt: "2024-01-15T10:30:00.000Z" }, // Monday 10am
        { totalAmount: 75, createdAt: "2024-01-15T14:00:00.000Z" }, // Monday 2pm
        { totalAmount: 200, createdAt: "2024-01-16T10:00:00.000Z" }, // Tuesday 10am
      ]);

      const res = await reportsService.getHourlySalesHeatmap(
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
        businessId,
      );

      expect(res.heatmap).toHaveLength(7); // 7 days
      expect(res.heatmap[0]).toHaveLength(24); // 24 hours
      expect(res.dayNames).toEqual([
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
      ]);
      expect(res.totalOrders).toBe(4);
      expect(res.peakHour.orders).toBeGreaterThan(0);
    });

    it("handles empty data", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([]);

      const res = await reportsService.getHourlySalesHeatmap({}, businessId);

      expect(res.totalOrders).toBe(0);
      expect(res.peakHour.orders).toBe(0);
    });

    it("applies outlet filter", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([]);

      await reportsService.getHourlySalesHeatmap(
        { outletId: "out-1" },
        businessId,
      );

      const args = prismaMock.posOrder.findMany.calls[0][0];
      expect(args.where.outletId).toBe("out-1");
    });
  });

  describe("Validation & Error Handling", () => {
    it("throws when businessId is missing in getTopProducts", async () => {
      await expect(reportsService.getTopProducts({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when outlet missing or cross-business in getTopProducts", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        reportsService.getTopProducts({ outletId: "o1" }, businessId),
      ).rejects.toThrow("Outlet not found");
    });

    it("throws when rules violated in getInventoryValuation", async () => {
      await expect(reportsService.getInventoryValuation({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when businessId is missing in getStockMovementReport", async () => {
      await expect(reportsService.getStockMovementReport({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when outlet missing or cross-business in getStockMovementReport", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        reportsService.getStockMovementReport({ outletId: "o1" }, businessId),
      ).rejects.toThrow("Outlet not found");
    });

    it("throws when businessId is missing in getOrderHistory", async () => {
      await expect(reportsService.getOrderHistory({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when outlet missing or cross-business in getOrderHistory", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        reportsService.getOrderHistory({ outletId: "o1" }, businessId),
      ).rejects.toThrow("Outlet not found");
    });

    it("throws when customer missing or cross-business in getOrderHistory", async () => {
      prismaMock.customer.findUnique.mockResolvedValue({
        id: "c1",
        businessId: "other",
      });
      await expect(
        reportsService.getOrderHistory({ customerId: "c1" }, businessId),
      ).rejects.toThrow("Customer not found");
    });

    it("throws when businessId is missing in getSalesTrend", async () => {
      await expect(reportsService.getSalesTrend({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when outlet missing or cross-business in getSalesTrend", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        reportsService.getSalesTrend({ outletId: "o1" }, businessId),
      ).rejects.toThrow("Outlet not found");
    });

    it("throws when businessId is missing in getHourlySalesHeatmap", async () => {
      await expect(reportsService.getHourlySalesHeatmap({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when outlet missing or cross-business in getHourlySalesHeatmap", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        reportsService.getHourlySalesHeatmap({ outletId: "o1" }, businessId),
      ).rejects.toThrow("Outlet not found");
    });
  });
});
