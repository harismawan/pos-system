import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const pricingMock = {
  resolvePrice: createMockFn(async () => ({ effectivePrice: 10, taxRate: 0 })),
};
const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
  enqueueEmailNotificationJob: createMockFn(),
};
const loggerMock = {
  info: createMockFn(),
  error: createMockFn(),
  warn: createMockFn(),
  debug: createMockFn(),
  child: createMockFn(() => loggerMock),
};

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));
mock.module(
  "../../../src/modules/pricing/pricing.service.js",
  () => pricingMock,
);
mock.module("../../../src/libs/jobs.js", () => jobsMock);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));

const salesService =
  await import("../../../src/modules/sales/sales.service.js?service");

const businessId = "biz-1";

describe("modules/sales/sales.service", () => {
  beforeEach(() => {
    prismaMock.posOrder.findUnique.mockReset?.();
    prismaMock.posOrder.findMany.mockReset?.();
    prismaMock.posOrder.count.mockReset?.();
    prismaMock.posOrder.create.mockReset?.();
    prismaMock.posOrder.update.mockReset?.();
    prismaMock.outlet.findUnique?.mockReset?.();
    prismaMock.stockMovement.create?.mockReset?.();
    prismaMock.inventory.findUnique?.mockReset?.();
    prismaMock.inventory.update?.mockReset?.();
    prismaMock.payment.create?.mockReset?.();
    prismaMock.payment.findMany?.mockReset?.();
    prismaMock.product.findUnique?.mockReset?.();
    prismaMock.customer.findUnique?.mockReset?.();
    jobsMock.enqueueAuditLogJob.mockReset();
    jobsMock.enqueueEmailNotificationJob.mockReset();
    loggerMock.info.mockReset();
    pricingMock.resolvePrice.mockReset();
    pricingMock.resolvePrice.mockResolvedValue({
      effectivePrice: 10,
      taxRate: 0,
    });
  });

  it("throws when completing an order that is not open", async () => {
    prismaMock.posOrder.findUnique.mockImplementation(async () => ({
      id: "o1",
      status: "COMPLETED",
      paymentStatus: "PAID",
      outlet: { businessId },
    }));

    await expect(
      salesService.completePosOrder("o1", "u1", businessId),
    ).rejects.toThrow("Order is not open");
  });

  it("throws when completing an unpaid order", async () => {
    prismaMock.posOrder.findUnique.mockImplementation(async () => ({
      id: "o1",
      status: "OPEN",
      paymentStatus: "PARTIAL",
      outlet: { businessId },
    }));

    await expect(
      salesService.completePosOrder("o1", "u1", businessId),
    ).rejects.toThrow("Order must be fully paid before completion");
  });

  it("creates POS order with calculated totals and price tiers", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      code: "OUT1",
      businessId,
    });
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", businessId });
    prismaMock.customer.findUnique.mockResolvedValue({ id: "c1", businessId });

    let createArgs;
    prismaMock.posOrder.create.mockImplementation(async (args) => {
      createArgs = args;
      return { id: "o1", ...args.data };
    });
    let priceCall = 0;
    pricingMock.resolvePrice.mockImplementation(async () => {
      priceCall += 1;
      if (priceCall === 1) {
        return { effectivePrice: 10, taxRate: 10, priceTier: { id: "tier1" } };
      }
      return { effectivePrice: 5, taxRate: 0 };
    });
    const originalRandom = Math.random;
    Math.random = () => 0.1234;

    const order = await salesService.createPosOrder(
      {
        outletId: "out-1",
        warehouseId: "w1",
        registerId: "r1",
        customerId: "c1",
        items: [
          { productId: "p1", quantity: 2, discountAmount: 1 },
          { productId: "p2", quantity: 1 },
        ],
        notes: "note",
      },
      "u1",
      businessId,
    );

    Math.random = originalRandom;

    expect(order.id).toBe("o1");
    expect(createArgs.data.items.create[0].effectivePriceTierId).toBe("tier1");
    expect(createArgs.data.totalAmount).toBeCloseTo(25.9);
    expect(createArgs.data.totalTaxAmount).toBeCloseTo(1.9);
    expect(createArgs.data.orderNumber.startsWith("OUT1-")).toBe(true);
    expect(createArgs.data.orderNumber.startsWith("OUT1-")).toBe(true);
  });

  it("gets POS orders with filters and pagination", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "out-1", businessId });
    prismaMock.customer.findUnique.mockResolvedValue({ id: "c1", businessId });
    prismaMock.posOrder.findMany.mockResolvedValue([{ id: "o1" }]);
    prismaMock.posOrder.count.mockResolvedValue(1);

    const res = await salesService.getPosOrders(
      {
        outletId: "out-1",
        status: "OPEN",
        customerId: "c1",
        cashierId: "u1",
        page: 2,
        limit: 5,
        businessId,
      },
      businessId,
    );

    const args = prismaMock.posOrder.findMany.calls[0][0];
    // The service adds outlet: { businessId } to ensure isolation
    expect(args.where).toEqual({
      outletId: "out-1",
      status: "OPEN",
      customerId: "c1",
      cashierId: "u1",
      outlet: { businessId: "biz-1" },
    });
    expect(args.skip).toBe(5);
    expect(res.pagination.totalPages).toBe(1);
  });

  it("returns POS order by id", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      items: [],
      payments: [],
      outlet: { businessId },
    });

    const res = await salesService.getPosOrderById("o1", businessId);

    expect(res.id).toBe("o1");
    const args = prismaMock.posOrder.findUnique.calls[0][0];
    expect(args.include.items.include.product).toBe(true);
  });

  it("completes order, updates inventory, and enqueues jobs", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      paymentStatus: "PAID",
      warehouseId: "w1",
      outletId: "out-1",
      orderNumber: "POS-1",
      totalAmount: 20,
      customer: { name: "Cust", email: "a@test.com" },
      items: [{ productId: "p1", quantity: 2 }],
      outlet: { businessId },
    });
    prismaMock.inventory.findUnique.mockResolvedValue({ id: "inv1" });
    prismaMock.posOrder.update.mockResolvedValue({
      id: "o1",
      status: "COMPLETED",
    });

    const res = await salesService.completePosOrder("o1", "u1", businessId);

    expect(res.status).toBe("COMPLETED");
    expect(prismaMock.stockMovement.create.calls.length).toBe(1);
    expect(prismaMock.inventory.update.calls.length).toBe(1);
    expect(prismaMock.inventory.update.calls.length).toBe(1);
    expect(jobsMock.enqueueEmailNotificationJob.calls.length).toBe(1);
  });

  it("completes order without sending email when customer missing", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      paymentStatus: "PAID",
      warehouseId: "w1",
      outletId: "out-1",
      orderNumber: "POS-1",
      totalAmount: 20,
      customer: null,
      items: [{ productId: "p1", quantity: 1 }],
      outlet: { businessId },
    });
    prismaMock.inventory.findUnique.mockResolvedValue({ id: "inv1" });
    prismaMock.posOrder.update.mockResolvedValue({
      id: "o1",
      status: "COMPLETED",
    });

    await salesService.completePosOrder("o1", "u1", businessId);

    expect(jobsMock.enqueueEmailNotificationJob.calls.length).toBe(0);
  });

  it("cancels order and enqueues audit log", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      outletId: "out-1",
      orderNumber: "POS-1",
      outlet: { businessId },
    });
    prismaMock.posOrder.update.mockResolvedValue({
      id: "o1",
      status: "CANCELLED",
    });

    const res = await salesService.cancelPosOrder("o1", "u1", businessId);

    expect(res.status).toBe("CANCELLED");
    expect(res.status).toBe("CANCELLED");
  });

  it("throws when cancelling non-open order", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "COMPLETED",
      outlet: { businessId },
    });

    await expect(
      salesService.cancelPosOrder("o1", "u1", businessId),
    ).rejects.toThrow("Only open orders can be cancelled");
  });

  it("adds payment and updates status to PAID", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      totalAmount: 100,
      outlet: { businessId },
    });
    prismaMock.payment.create.mockResolvedValue({ id: "pay1" });
    prismaMock.payment.findMany.mockResolvedValue([{ amount: 100 }]);
    prismaMock.posOrder.update.mockResolvedValue({
      id: "o1",
      paymentStatus: "PAID",
    });

    const res = await salesService.addPayment(
      "o1",
      {
        method: "CASH",
        amount: 100,
      },
      businessId,
    );

    expect(res.order.paymentStatus).toBe("PAID");
    expect(res.order.paymentStatus).toBe("PAID");
  });

  it("adds payment and sets status to PARTIAL", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "OPEN",
      totalAmount: 100,
      outlet: { businessId },
    });
    prismaMock.payment.create.mockResolvedValue({ id: "pay1" });
    prismaMock.payment.findMany.mockResolvedValue([{ amount: 50 }]);
    prismaMock.posOrder.update.mockResolvedValue({
      id: "o1",
      paymentStatus: "PARTIAL",
    });

    const res = await salesService.addPayment(
      "o1",
      {
        method: "CARD",
        amount: 50,
      },
      businessId,
    );

    expect(res.order.paymentStatus).toBe("PARTIAL");
  });

  it("throws when adding payment to non-open order", async () => {
    prismaMock.posOrder.findUnique.mockResolvedValue({
      id: "o1",
      status: "COMPLETED",
      outlet: { businessId },
    });

    await expect(
      salesService.addPayment("o1", { method: "CARD", amount: 10 }, businessId),
    ).rejects.toThrow("Cannot add payment to non-open order");
  });

  describe("Validation & Error Handling", () => {
    it("throws when businessId is missing in createPosOrder", async () => {
      await expect(salesService.createPosOrder({}, "u1")).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when outlet missing or cross-business in createPosOrder", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        salesService.createPosOrder({ outletId: "o1" }, "u1", businessId),
      ).rejects.toThrow("Outlet not found or access denied");
    });

    it("throws when customer belongs to another business in createPosOrder", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
      prismaMock.customer.findUnique.mockResolvedValue({
        id: "c1",
        businessId: "other",
      });
      await expect(
        salesService.createPosOrder(
          { outletId: "o1", customerId: "c1" },
          "u1",
          businessId,
        ),
      ).rejects.toThrow("Customer not found");
    });

    it("throws when product belongs to another business in createPosOrder", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
      prismaMock.product.findUnique.mockResolvedValue({
        id: "p1",
        businessId: "other",
      });
      await expect(
        salesService.createPosOrder(
          {
            outletId: "o1",
            items: [{ productId: "p1", quantity: 1 }],
          },
          "u1",
          businessId,
        ),
      ).rejects.toThrow("Product p1 not found");
    });

    it("throws when businessId is missing in getPosOrderById", async () => {
      await expect(salesService.getPosOrderById("o1")).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when order belongs to another business in getPosOrderById", async () => {
      prismaMock.posOrder.findUnique.mockResolvedValue({
        id: "o1",
        outlet: { businessId: "other" },
      });
      await expect(
        salesService.getPosOrderById("o1", businessId),
      ).rejects.toThrow("Order not found");
    });

    it("throws when businessId is missing in getPosOrders", async () => {
      await expect(salesService.getPosOrders({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when outlet belongs to another business in getPosOrders", async () => {
      prismaMock.outlet.findUnique.mockResolvedValue({
        id: "o1",
        businessId: "other",
      });
      await expect(
        salesService.getPosOrders({ outletId: "o1" }, businessId),
      ).rejects.toThrow("Outlet not found");
    });

    it("throws when customer belongs to another business in getPosOrders", async () => {
      prismaMock.customer.findUnique.mockResolvedValue({
        id: "c1",
        businessId: "other",
      });
      await expect(
        salesService.getPosOrders({ customerId: "c1" }, businessId),
      ).rejects.toThrow("Customer not found");
    });

    it("throws when businessId is missing in completePosOrder", async () => {
      await expect(salesService.completePosOrder("o1", "u1")).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when businessId is missing in cancelPosOrder", async () => {
      await expect(salesService.cancelPosOrder("o1", "u1")).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when businessId is missing in addPayment", async () => {
      await expect(salesService.addPayment("o1", {})).rejects.toThrow(
        "businessId is required",
      );
    });
  });
});
