import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createPrismaMock } from "../../mocks/prisma.js";

const prismaMock = createPrismaMock();

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));

const reportsService =
  await import("../../../src/modules/reports/reports.service.js");

describe("modules/reports/reports.service", () => {
  beforeEach(() => {
    prismaMock.posOrder.findMany.mockReset?.();
    prismaMock.posOrder.count.mockReset?.();
    prismaMock.posOrderItem.findMany.mockReset?.();
    prismaMock.inventory.findMany.mockReset?.();
    prismaMock.stockMovement.findMany.mockReset?.();
    prismaMock.stockMovement.count.mockReset?.();
    prismaMock.stockMovement.groupBy?.mockReset?.();
  });

  it("returns zeroed summary when there are no orders", async () => {
    prismaMock.posOrder.findMany.mockImplementation(async () => []);

    const result = await reportsService.getSalesSummary({});

    expect(result.summary.totalRevenue).toBe(0);
    expect(result.summary.totalOrders).toBe(0);
    expect(result.summary.averageOrderValue).toBe(0);
  });

  it("computes sales summary and groups by month", async () => {
    const createdAt = "2024-01-15T00:00:00.000Z";
    prismaMock.posOrder.findMany.mockResolvedValue([
      {
        id: "1",
        totalAmount: 100,
        totalDiscountAmount: 10,
        totalTaxAmount: 5,
        createdAt,
        items: [{ quantity: 2 }],
      },
      {
        id: "2",
        totalAmount: 50,
        totalDiscountAmount: 0,
        totalTaxAmount: 2,
        createdAt,
        items: [{ quantity: 1 }],
      },
    ]);

    const res = await reportsService.getSalesSummary({
      outletId: "out-1",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      groupBy: "month",
    });

    const args = prismaMock.posOrder.findMany.calls[0][0];
    expect(args.where.outletId).toBe("out-1");
    expect(args.where.createdAt.gte).toEqual(new Date("2024-01-01"));
    expect(res.summary.totalRevenue).toBe(150);
    expect(res.summary.totalItems).toBe(3);
    expect(res.summary.totalDiscount).toBe(10);
    expect(res.chartData[0].date).toBe("2024-01");
  });

  it("groups sales by week", async () => {
    const createdAt = "2024-01-10T00:00:00.000Z"; // A Wednesday
    prismaMock.posOrder.findMany.mockResolvedValue([
      {
        id: "1",
        totalAmount: 100,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        createdAt,
        items: [{ quantity: 1 }],
      },
    ]);

    const res = await reportsService.getSalesSummary({ groupBy: "week" });

    // Jan 10 2024 is Wed. Week start (Sun) should be Jan 7 2024.
    expect(res.chartData[0].date).toBe("2024-01-07");
  });

  it("groups sales by day (default)", async () => {
    const createdAt = "2024-01-15T10:00:00.000Z";
    prismaMock.posOrder.findMany.mockResolvedValue([
      {
        id: "1",
        totalAmount: 100,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        createdAt,
        items: [{ quantity: 1 }],
      },
    ]);

    const res = await reportsService.getSalesSummary({ groupBy: "day" });

    expect(res.chartData[0].date).toBe("2024-01-15");
  });

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

    const result = await reportsService.getTopProducts({ sortBy: "quantity" });

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

    const res = await reportsService.getTopProducts({
      outletId: "out-1",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      limit: 1,
    });

    const args = prismaMock.posOrderItem.findMany.calls[0][0];
    expect(args.where.posOrder.outletId).toBe("out-1");
    expect(args.where.posOrder.createdAt.gte).toEqual(new Date("2024-01-01"));
    expect(res.products).toHaveLength(1);
    expect(res.products[0].product.id).toBe("p2");
  });

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

    const res = await reportsService.getInventoryValuation({
      warehouseId: "w1",
      category: "Food",
    });

    const args = prismaMock.inventory.findMany.calls[0][0];
    expect(args.where.warehouseId).toBe("w1");
    expect(res.items).toHaveLength(1);
    expect(res.summary.lowStockCount).toBe(0);
    expect(res.summary.totalRetailValue).toBe(15);
  });

  it("fetches stock movements with filters and summary", async () => {
    prismaMock.stockMovement.findMany.mockResolvedValue([
      { id: "m1", type: "PURCHASE", quantity: 2 },
    ]);
    prismaMock.stockMovement.count.mockResolvedValue(1);
    prismaMock.stockMovement.groupBy.mockResolvedValue([
      { type: "PURCHASE", _count: 1, _sum: { quantity: 2 } },
    ]);

    const res = await reportsService.getStockMovementReport({
      outletId: "out-1",
      warehouseId: "w1",
      type: "PURCHASE",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      page: 2,
      limit: 1,
    });

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

  it("returns order history with pagination and filters", async () => {
    prismaMock.posOrder.findMany.mockResolvedValue([{ id: "o1" }]);
    prismaMock.posOrder.count.mockResolvedValue(1);

    const res = await reportsService.getOrderHistory({
      outletId: "out-1",
      status: "COMPLETED",
      customerId: "c1",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      page: 3,
      limit: 5,
    });

    const args = prismaMock.posOrder.findMany.calls[0][0];
    expect(args.where.customerId).toBe("c1");
    expect(args.skip).toBe(10);
    expect(res.pagination.totalPages).toBe(1);
    expect(res.orders[0].id).toBe("o1");
  });
});
