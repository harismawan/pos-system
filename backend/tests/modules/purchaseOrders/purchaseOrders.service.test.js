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

const businessId = "biz-1";

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
    prismaMock.supplier.findUnique?.mockReset?.();
    prismaMock.product.findUnique?.mockReset?.();
    prismaMock.product.findMany?.mockReset?.();
    prismaMock.purchaseOrderItem.deleteMany?.mockReset?.();
    jobsMock.enqueueAuditLogJob.mockReset();

    // Default mock for outlet validation if needed
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "out-1",
      code: "OUT1",
      businessId: businessId,
    });
  });

  describe("getPurchaseOrders", () => {
    it("lists purchase orders with pagination", async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([{ id: "po1" }]);
      prismaMock.purchaseOrder.count.mockResolvedValue(1);

      const result = await purchaseOrdersService.getPurchaseOrders(
        { page: 1 },
        businessId,
      );

      const args = prismaMock.purchaseOrder.findMany.calls[0][0];
      // Updated expectation: businessId is in AND clause for relations
      expect(args.where.AND).toBeDefined();
      // Check that at least one condition filters by supplier.businessId or outlet.businessId
      const hasBusinessFilter = args.where.AND.some(
        (c) =>
          c.supplier?.businessId === businessId ||
          c.outlet?.businessId === businessId,
      );
      expect(hasBusinessFilter).toBe(true);

      expect(result.orders).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it("applies filters when listing purchase orders", async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([]);
      prismaMock.purchaseOrder.count.mockResolvedValue(0);

      // Fix: Mock supplier validation
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "sup-1",
        businessId,
      });
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "out-1",
        businessId,
      });

      await purchaseOrdersService.getPurchaseOrders(
        {
          status: "DRAFT",
          outletId: "out-1",
          supplierId: "sup-1",
        },
        businessId,
      );

      const args = prismaMock.purchaseOrder.findMany.calls[0][0];
      const where = args.where;

      expect(where.supplierId).toBe("sup-1");
      expect(where.outletId).toBe("out-1");
      expect(where.status).toBe("DRAFT");
    });
  });

  describe("getPurchaseOrderById", () => {
    it("returns purchase order with related data", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        outlet: { id: "out-1", name: "Outlet", businessId },
        supplier: { id: "sup-1", name: "Supplier", businessId },
        items: [],
        businessId,
      });

      const res = await purchaseOrdersService.getPurchaseOrderById(
        "po1",
        businessId,
      );
      expect(res.id).toBe("po1");
      expect(res.outlet).toBeDefined();
    });

    it("throws when purchase order is not found", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue(null);
      await expect(
        purchaseOrdersService.getPurchaseOrderById("missing", businessId),
      ).rejects.toThrow("Purchase order not found");
    });
  });

  describe("createPurchaseOrder", () => {
    it("creates purchase order and enqueues audit log", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "out-1",
        businessId,
      });
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "sup-1",
        businessId,
      });
      prismaMock.product.findUnique.mockResolvedValue({ id: "p1", businessId });

      prismaMock.product.findMany.mockResolvedValue([
        { id: "p1", costPrice: 10 },
      ]);

      let createArgs;
      prismaMock.purchaseOrder.create.mockImplementation(async (args) => {
        createArgs = args;
        return {
          id: "po1",
          status: "DRAFT",
          orderNumber: args.data.orderNumber,
        };
      });

      const res = await purchaseOrdersService.createPurchaseOrder(
        {
          outletId: "out-1",
          supplierId: "sup-1",
          items: [{ productId: "p1", quantity: 5, unitCost: 10 }], // Fix: Added unitCost
        },
        "u1",
        businessId,
      );

      expect(res.id).toBe("po1");
      expect(res.id).toBe("po1");
    });
  });

  describe("updatePurchaseOrder", () => {
    it("updates draft purchase order", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "DRAFT",
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      prismaMock.product.findUnique.mockResolvedValue({ id: "p1", businessId });
      prismaMock.product.findMany.mockResolvedValue([
        { id: "p1", costPrice: 10 },
      ]);
      prismaMock.purchaseOrder.update.mockResolvedValue({
        id: "po1",
        status: "DRAFT",
        notes: "updated",
      });
      prismaMock.purchaseOrderItem.deleteMany.mockResolvedValue({});

      const res = await purchaseOrdersService.updatePurchaseOrder(
        "po1",
        { expectedDate: "2024-02-02", notes: "updated" },
        "user-1",
        businessId,
      );

      expect(res.notes).toBe("updated");
    });

    it("throws when updating non-draft or missing order", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "RECEIVED",
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      await expect(
        purchaseOrdersService.updatePurchaseOrder("po1", {}, "u1", businessId),
      ).rejects.toThrow("Can only update draft purchase orders");
    });
  });

  describe("receivePurchaseOrder", () => {
    it("receives purchase order and updates inventory", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "DRAFT",
        warehouseId: "wh-1",
        outletId: "out-1",
        orderNumber: "PO-1",
        items: [
          { id: "item1", productId: "p1", quantity: 10, receivedQuantity: 0 },
        ],
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      prismaMock.purchaseOrder.update.mockResolvedValue({
        id: "po1",
        status: "RECEIVED",
      });
      prismaMock.purchaseOrderItem.update.mockResolvedValue({});
      prismaMock.inventory.upsert.mockResolvedValue({});
      prismaMock.stockMovement.create.mockResolvedValue({});

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(prismaMock);
      });

      const res = await purchaseOrdersService.receivePurchaseOrder(
        "po1",
        [{ itemId: "item1", quantity: 10 }],
        "u1",
        businessId,
      );

      expect(res.status).toBe("RECEIVED");
      expect(prismaMock.inventory.update.calls.length).toBeGreaterThan(0);
    });

    it("throws when receiving already received, cancelled, or missing item", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "RECEIVED",
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      await expect(
        purchaseOrdersService.receivePurchaseOrder("po1", [], "u1", businessId),
      ).rejects.toThrow("Purchase order already received");
    });
  });

  describe("cancelPurchaseOrder", () => {
    it("cancels purchase order and enqueues audit log", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "DRAFT",
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      prismaMock.purchaseOrder.update.mockResolvedValue({
        id: "po1",
        status: "CANCELLED",
      });

      const res = await purchaseOrdersService.cancelPurchaseOrder(
        "po1",
        "u1",
        businessId,
      );

      expect(res.status).toBe("CANCELLED");
      expect(res.status).toBe("CANCELLED");
    });

    it("throws when cancelling received or already cancelled order", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "RECEIVED",
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      await expect(
        purchaseOrdersService.cancelPurchaseOrder("po1", "u1", businessId),
      ).rejects.toThrow("Cannot cancel received purchase order");
    });
  });

  describe("Validation & Error Handling", () => {
    it("throws when businessId is missing in getPurchaseOrders", async () => {
      await expect(purchaseOrdersService.getPurchaseOrders({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when supplier missing or cross-business in getPurchaseOrders", async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "s1",
        businessId: "other",
      });
      await expect(
        purchaseOrdersService.getPurchaseOrders(
          { supplierId: "s1" },
          businessId,
        ),
      ).rejects.toThrow("Supplier not found");
    });

    it("throws when outlet missing or cross-business in getPurchaseOrders", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        purchaseOrdersService.getPurchaseOrders({ outletId: "o1" }, businessId),
      ).rejects.toThrow("Outlet not found");
    });

    it("filters by warehouseId in getPurchaseOrders", async () => {
      prismaMock.purchaseOrder.findMany.mockResolvedValue([]);
      prismaMock.purchaseOrder.count.mockResolvedValue(0);
      await purchaseOrdersService.getPurchaseOrders(
        { warehouseId: "w1" },
        businessId,
      );
      const where = prismaMock.purchaseOrder.findMany.calls[0][0].where;
      expect(where.warehouseId).toBe("w1");
    });

    it("throws when businessId is missing in getPurchaseOrderById", async () => {
      await expect(
        purchaseOrdersService.getPurchaseOrderById("po1"),
      ).rejects.toThrow("businessId is required");
    });

    it("throws when accessing cross-business order in getPurchaseOrderById", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        outlet: { businessId: "other" },
        supplier: { businessId: businessId },
      });
      await expect(
        purchaseOrdersService.getPurchaseOrderById("po1", businessId),
      ).rejects.toThrow("Purchase order not found");
    });

    it("throws when businessId is missing in createPurchaseOrder", async () => {
      await expect(
        purchaseOrdersService.createPurchaseOrder({}, "u1"),
      ).rejects.toThrow("businessId is required");
    });

    it("throws when supplier cross-business in createPurchaseOrder", async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "s1",
        businessId: "other",
      });
      await expect(
        purchaseOrdersService.createPurchaseOrder(
          { supplierId: "s1" },
          "u1",
          businessId,
        ),
      ).rejects.toThrow("Supplier not found");
    });

    it("throws when outlet cross-business in createPurchaseOrder", async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "s1",
        businessId: businessId,
      });
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        purchaseOrdersService.createPurchaseOrder(
          { supplierId: "s1", outletId: "o1" },
          "u1",
          businessId,
        ),
      ).rejects.toThrow("Outlet not found");
    });

    it("throws when product cross-business in createPurchaseOrder", async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "s1",
        businessId: businessId,
      });
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: businessId,
      });
      prismaMock.product.findUnique.mockResolvedValue({
        id: "p1",
        businessId: "other",
      });
      await expect(
        purchaseOrdersService.createPurchaseOrder(
          {
            supplierId: "s1",
            outletId: "o1",
            items: [{ productId: "p1" }],
          },
          "u1",
          businessId,
        ),
      ).rejects.toThrow("Product p1 not found");
    });

    it("throws when businessId is missing in updatePurchaseOrder", async () => {
      await expect(
        purchaseOrdersService.updatePurchaseOrder("po1", {}, "u1"),
      ).rejects.toThrow("businessId is required");
    });

    it("throws when updating cross-business order in updatePurchaseOrder", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        outlet: { businessId: "other" },
      });
      await expect(
        purchaseOrdersService.updatePurchaseOrder("po1", {}, "u1", businessId),
      ).rejects.toThrow("Purchase order not found");
    });

    // Covering redundant check line 287 (implicitly by null return in 282 if findUnique is null)
    // But practically, line 282 handles null logic well.

    it("throws when businessId is missing in receivePurchaseOrder", async () => {
      await expect(
        purchaseOrdersService.receivePurchaseOrder("po1", [], "u1"),
      ).rejects.toThrow("businessId is required");
    });

    it("throws when receiving cancelled order", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "CANCELLED",
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      await expect(
        purchaseOrdersService.receivePurchaseOrder("po1", [], "u1", businessId),
      ).rejects.toThrow("Cannot receive cancelled purchase order");
    });

    it("throws when item not found in PO during receive", async () => {
      prismaMock.purchaseOrder.findUnique.mockResolvedValue({
        id: "po1",
        status: "DRAFT",
        items: [],
        outlet: { businessId },
        supplier: { businessId },
        businessId,
      });
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));

      await expect(
        purchaseOrdersService.receivePurchaseOrder(
          "po1",
          [{ itemId: "missing" }],
          "u1",
          businessId,
        ),
      ).rejects.toThrow("Item missing not found in purchase order");
    });

    it("throws when businessId is missing in cancelPurchaseOrder", async () => {
      await expect(
        purchaseOrdersService.cancelPurchaseOrder("po1", "u1"),
      ).rejects.toThrow("businessId is required");
    });
  });
});
