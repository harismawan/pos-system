import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../mocks/prisma.js";
import { loggerMock } from "../mocks/logger.js";

const prismaMock = createPrismaMock();

mock.module("../../src/libs/prisma.js", () => ({ default: prismaMock }));
mock.module("../../src/libs/logger.js", () => ({ default: loggerMock }));

const { handleReportGenerationJob } =
  await import("../../src/jobs/reportGeneration.job.js");

describe("jobs/reportGeneration", () => {
  beforeEach(() => {
    prismaMock.posOrder.findMany.mockReset?.();
    prismaMock.inventory.findMany.mockReset?.();
    loggerMock.info.mockReset?.();
    loggerMock.debug.mockReset?.();
    loggerMock.error.mockReset?.();
  });

  describe("sales_summary report", () => {
    it("generates sales summary report", async () => {
      const mockOrders = [
        {
          id: "order-1",
          totalAmount: "100.00",
          items: [
            {
              product: { id: "prod-1", name: "Product 1" },
              quantity: "2",
              lineTotal: "60.00",
            },
          ],
        },
        {
          id: "order-2",
          totalAmount: "50.00",
          items: [
            {
              product: { id: "prod-1", name: "Product 1" },
              quantity: "1",
              lineTotal: "30.00",
            },
          ],
        },
      ];
      prismaMock.posOrder.findMany.mockResolvedValue(mockOrders);

      const payload = {
        reportType: "sales_summary",
        params: {
          from: "2024-01-01",
          to: "2024-01-31",
          outletId: "outlet-1",
        },
      };

      const result = await handleReportGenerationJob(payload);

      expect(result.totalRevenue).toBe(150);
      expect(result.totalOrders).toBe(2);
      expect(result.averageOrderValue).toBe(75);
      expect(result.topProducts.length).toBe(1);
      expect(result.topProducts[0].name).toBe("Product 1");
      expect(result.topProducts[0].quantity).toBe(3);
      expect(result.topProducts[0].revenue).toBe(90);
    });

    it("sorts top products by revenue descending", async () => {
      const mockOrders = [
        {
          id: "order-1",
          totalAmount: "200.00",
          items: [
            {
              product: { id: "prod-1", name: "Low Revenue Product" },
              quantity: "1",
              lineTotal: "20.00",
            },
            {
              product: { id: "prod-2", name: "High Revenue Product" },
              quantity: "2",
              lineTotal: "100.00",
            },
            {
              product: { id: "prod-3", name: "Medium Revenue Product" },
              quantity: "1",
              lineTotal: "50.00",
            },
          ],
        },
      ];
      prismaMock.posOrder.findMany.mockResolvedValue(mockOrders);

      const payload = {
        reportType: "sales_summary",
        params: {
          from: "2024-01-01",
          to: "2024-01-31",
        },
      };

      const result = await handleReportGenerationJob(payload);

      // Should be sorted by revenue descending
      expect(result.topProducts[0].name).toBe("High Revenue Product");
      expect(result.topProducts[0].revenue).toBe(100);
      expect(result.topProducts[1].name).toBe("Medium Revenue Product");
      expect(result.topProducts[1].revenue).toBe(50);
      expect(result.topProducts[2].name).toBe("Low Revenue Product");
      expect(result.topProducts[2].revenue).toBe(20);
    });

    it("returns zero values when no orders", async () => {
      prismaMock.posOrder.findMany.mockResolvedValue([]);

      const payload = {
        reportType: "sales_summary",
        params: {
          from: "2024-01-01",
          to: "2024-01-31",
        },
      };

      const result = await handleReportGenerationJob(payload);

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.topProducts).toEqual([]);
    });
  });

  describe("stock_summary report", () => {
    it("generates stock summary report with outletId filter", async () => {
      const mockInventories = [
        {
          quantityOnHand: "10",
          minimumStock: "5",
          product: { name: "Product 1" },
          warehouse: { name: "Warehouse 1", outlet: { name: "Outlet 1" } },
        },
        {
          quantityOnHand: "2",
          minimumStock: "5",
          product: { name: "Product 2" },
          warehouse: { name: "Warehouse 1", outlet: { name: "Outlet 1" } },
        },
      ];
      prismaMock.inventory.findMany.mockResolvedValue(mockInventories);

      const payload = {
        reportType: "stock_summary",
        params: {
          outletId: "outlet-1",
        },
      };

      const result = await handleReportGenerationJob(payload);

      expect(result.totalProducts).toBe(2);
      expect(result.lowStockCount).toBe(1);
      expect(result.lowStockItems.length).toBe(1);
      expect(result.lowStockItems[0].product).toBe("Product 2");
    });

    it("generates stock summary report without outletId", async () => {
      const mockInventories = [
        {
          quantityOnHand: "5",
          minimumStock: "5",
          product: { name: "Product 1" },
          warehouse: { name: "Warehouse 1", outlet: { name: "Outlet 1" } },
        },
      ];
      prismaMock.inventory.findMany.mockResolvedValue(mockInventories);

      const payload = {
        reportType: "stock_summary",
        params: {},
      };

      const result = await handleReportGenerationJob(payload);

      expect(result.totalProducts).toBe(1);
      expect(result.lowStockCount).toBe(1); // 5 <= 5 is low stock
      expect(result.outletId).toBeUndefined();
    });
  });

  it("throws error for unknown report type", async () => {
    const payload = {
      reportType: "unknown_report",
      params: {},
    };

    await expect(handleReportGenerationJob(payload)).rejects.toThrow(
      "Unknown report type: unknown_report",
    );
  });

  it("throws and logs error when database fails", async () => {
    const error = new Error("Database error");
    prismaMock.posOrder.findMany.mockRejectedValue(error);

    const payload = {
      reportType: "sales_summary",
      params: { from: "2024-01-01", to: "2024-01-31" },
    };

    await expect(handleReportGenerationJob(payload)).rejects.toThrow(
      "Database error",
    );
    expect(loggerMock.error.calls.length).toBeGreaterThan(0);
  });
});
