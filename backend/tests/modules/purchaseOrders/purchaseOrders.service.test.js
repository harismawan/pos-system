import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const jobsMock = { enqueueAuditLogJob: createMockFn() };
const loggerMock = {
  info: createMockFn(),
  error: createMockFn(),
  warn: createMockFn(),
  debug: createMockFn(),
  child: createMockFn(() => loggerMock),
};

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const purchaseOrdersService =
  await import("../../../src/modules/purchaseOrders/purchaseOrders.service.js?coverage");

describe("modules/purchaseOrders/purchaseOrders.service", () => {
  beforeEach(() => {
    prismaMock.purchaseOrder.findMany.mockReset?.();
    prismaMock.purchaseOrder.count.mockReset?.();
    prismaMock.purchaseOrder.findUnique.mockReset?.();
    prismaMock.purchaseOrder.create.mockReset?.();
    prismaMock.purchaseOrder.update.mockReset?.();
    prismaMock.outlet.findUnique?.mockReset?.();
    prismaMock.purchaseOrderItem.update?.mockReset?.();
    prismaMock.inventory.findUnique?.mockReset?.();
    prismaMock.inventory.create?.mockReset?.();
    prismaMock.inventory.update?.mockReset?.();
    prismaMock.stockMovement.create?.mockReset?.();
    jobsMock.enqueueAuditLogJob.mockReset();
  });

  it("lists purchase orders with pagination", async () => {
    prismaMock.purchaseOrder.findMany.mockResolvedValue([{ id: "po1" }]);
    prismaMock.purchaseOrder.count.mockResolvedValue(1);

    const result = await purchaseOrdersService.getPurchaseOrders({
      page: 1,
      limit: 10,
    });
    expect(result.orders.length).toBe(1);
    expect(result.pagination.total).toBe(1);
  });

  it("applies filters when listing purchase orders", async () => {
    prismaMock.purchaseOrder.findMany.mockResolvedValue([]);
    prismaMock.purchaseOrder.count.mockResolvedValue(0);

    await purchaseOrdersService.getPurchaseOrders({
      supplierId: "sup-1",
      warehouseId: "wh-1",
      outletId: "out-1",
      status: "DRAFT",
      page: 2,
      limit: 5,
    });

    const args = prismaMock.purchaseOrder.findMany.calls[0][0];
    expect(args.where).toEqual({
      supplierId: "sup-1",
      warehouseId: "wh-1",
      outletId: "out-1",
      status: "DRAFT",
    });
    expect(args.skip).toBe(5);
    expect(args.include.supplier).toBe(true);
  });

  it("throws when purchase order is not found", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue(null);
    await expect(
      purchaseOrdersService.getPurchaseOrderById("missing"),
    ).rejects.toThrow("Purchase order not found");
  });

  it("returns purchase order with related data", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      supplier: {},
    });

    const res = await purchaseOrdersService.getPurchaseOrderById("po1");
    expect(res.id).toBe("po1");
    const args = prismaMock.purchaseOrder.findUnique.calls[0][0];
    expect(args.include.items.include.product).toBe(true);
    expect(args.include.receivedBy.select.username).toBe(true);
  });

  it("creates purchase order and enqueues audit log", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ code: "OUT1" });
    let createArgs;
    prismaMock.purchaseOrder.create.mockImplementation(async (args) => {
      createArgs = args;
      return {
        id: "po1",
        orderNumber: args.data.orderNumber,
        items: [],
        supplier: {},
        warehouse: {},
      };
    });
    const originalRandom = Math.random;
    Math.random = () => 0.1234;

    const order = await purchaseOrdersService.createPurchaseOrder(
      {
        supplierId: "sup-1",
        warehouseId: "wh-1",
        outletId: "out-1",
        expectedDate: "2024-01-01",
        notes: "note",
        items: [
          { productId: "prod1", quantity: 2, unitCost: 5 },
          { productId: "prod2", quantity: 1, unitCost: 3 },
        ],
      },
      "user-1",
    );

    Math.random = originalRandom;

    expect(order.id).toBe("po1");
    expect(createArgs.data.items.create.length).toBe(2);
    expect(createArgs.data.totalAmount.toString()).toBe("13");
    expect(createArgs.data.expectedDate instanceof Date).toBe(true);
    expect(createArgs.data.orderNumber.startsWith("PO-OUT1-")).toBe(true);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
  });

  it("updates draft purchase order", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "DRAFT",
    });
    prismaMock.purchaseOrder.update.mockResolvedValue({
      id: "po1",
      status: "DRAFT",
      notes: "updated",
    });

    const res = await purchaseOrdersService.updatePurchaseOrder(
      "po1",
      { expectedDate: "2024-02-02", notes: "updated" },
      "user-1",
    );

    expect(res.notes).toBe("updated");
    const args = prismaMock.purchaseOrder.update.calls[0][0];
    expect(args.data.expectedDate instanceof Date).toBe(true);
  });

  it("throws when updating non-draft or missing order", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue(null);
    await expect(
      purchaseOrdersService.updatePurchaseOrder("missing", {}, "u1"),
    ).rejects.toThrow("Purchase order not found");

    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "RECEIVED",
    });
    await expect(
      purchaseOrdersService.updatePurchaseOrder("po1", {}, "u1"),
    ).rejects.toThrow("Can only update draft purchase orders");
  });

  it("receives purchase order and updates inventory", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "DRAFT",
      warehouseId: "wh-1",
      outletId: "out-1",
      orderNumber: "PO-1",
      items: [{ id: "item1", productId: "prod1" }],
    });
    prismaMock.inventory.findUnique.mockResolvedValue(null);
    prismaMock.purchaseOrder.update.mockResolvedValue({
      id: "po1",
      status: "RECEIVED",
      items: [],
      supplier: {},
      warehouse: {},
    });

    const res = await purchaseOrdersService.receivePurchaseOrder(
      "po1",
      [{ itemId: "item1", quantity: 2 }],
      "user-1",
    );

    expect(res.status).toBe("RECEIVED");
    expect(prismaMock.purchaseOrderItem.update.calls.length).toBe(1);
    expect(prismaMock.inventory.create.calls.length).toBe(1);
    expect(prismaMock.stockMovement.create.calls.length).toBe(1);
    expect(jobsMock.enqueueAuditLogJob.calls.at(-1)[0].eventType).toBe(
      "PURCHASE_ORDER_RECEIVED",
    );
  });

  it("throws when receiving already received, cancelled, or missing item", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "RECEIVED",
      items: [],
    });
    await expect(
      purchaseOrdersService.receivePurchaseOrder("po1", [], "u1"),
    ).rejects.toThrow("Purchase order already received");

    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "CANCELLED",
      items: [],
    });
    await expect(
      purchaseOrdersService.receivePurchaseOrder("po1", [], "u1"),
    ).rejects.toThrow("Cannot receive cancelled purchase order");

    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "DRAFT",
      warehouseId: "wh-1",
      outletId: "out-1",
      orderNumber: "PO-1",
      items: [],
    });
    await expect(
      purchaseOrdersService.receivePurchaseOrder(
        "po1",
        [{ itemId: "missing", quantity: 1 }],
        "u1",
      ),
    ).rejects.toThrow("Item missing not found in purchase order");
  });

  it("cancels purchase order and enqueues audit log", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "DRAFT",
      outletId: "out-1",
      orderNumber: "PO-1",
      items: [],
    });
    prismaMock.purchaseOrder.update.mockResolvedValue({
      id: "po1",
      status: "CANCELLED",
      items: [],
      supplier: {},
      warehouse: {},
    });

    const res = await purchaseOrdersService.cancelPurchaseOrder(
      "po1",
      "user-1",
    );

    expect(res.status).toBe("CANCELLED");
    expect(jobsMock.enqueueAuditLogJob.calls.at(-1)[0].eventType).toBe(
      "PURCHASE_ORDER_CANCELLED",
    );
  });

  it("throws when cancelling received or already cancelled order", async () => {
    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "RECEIVED",
    });
    await expect(
      purchaseOrdersService.cancelPurchaseOrder("po1", "u1"),
    ).rejects.toThrow("Cannot cancel received purchase order");

    prismaMock.purchaseOrder.findUnique.mockResolvedValue({
      id: "po1",
      status: "CANCELLED",
    });
    await expect(
      purchaseOrdersService.cancelPurchaseOrder("po1", "u1"),
    ).rejects.toThrow("Purchase order already cancelled");
  });
});
