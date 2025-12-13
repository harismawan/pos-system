import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createLoggerMock } from "../../mocks/logger.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const loggerMock = createLoggerMock();
const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
};

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const inventoryService =
  await import("../../../src/modules/inventory/inventory.service.js");

const businessId = "biz-1";

describe("modules/inventory/inventory.service", () => {
  beforeEach(() => {
    prismaMock.inventory.findUnique.mockReset?.();
    prismaMock.inventory.update.mockReset?.();
    prismaMock.inventory.create.mockReset?.();
    prismaMock.stockMovement.create.mockReset?.();
    prismaMock.$queryRawUnsafe.mockReset?.();
    prismaMock.inventory.findMany.mockReset?.();
    prismaMock.inventory.count.mockReset?.();
    prismaMock.stockMovement.findMany?.mockReset?.();
    prismaMock.stockMovement.count?.mockReset?.();
    prismaMock.product.findUnique?.mockReset?.();
    jobsMock.enqueueAuditLogJob.mockReset?.();
    loggerMock.info.mockReset?.();

    // Default mock for product validation
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p1",
      businessId: businessId, // Ensure product belongs to business
    });
  });

  it("rejects invalid adjustment types", async () => {
    await expect(
      inventoryService.adjustInventory(
        {
          productId: "p1",
          warehouseId: "w1",
          outletId: "o1",
          quantity: 5,
          type: "INVALID",
        },
        "user-1",
        businessId,
      ),
    ).rejects.toThrow("Invalid adjustment type");
  });

  it("prevents negative inventory on adjustment out", async () => {
    prismaMock.inventory.findUnique.mockImplementation(async () => ({
      quantityOnHand: 1,
    }));

    await expect(
      inventoryService.adjustInventory(
        {
          productId: "p1",
          warehouseId: "w1",
          outletId: "o1",
          quantity: 5,
          type: "ADJUSTMENT_OUT",
        },
        "user-1",
        businessId,
      ),
    ).rejects.toThrow("Adjustment would result in negative inventory");

    expect(prismaMock.inventory.update.calls.length).toBe(0);
  });

  it("creates inventory and adjusts in when missing record", async () => {
    prismaMock.inventory.findUnique.mockResolvedValue(null);
    prismaMock.inventory.create.mockResolvedValue({ id: "inv1" });
    prismaMock.inventory.update.mockResolvedValue({
      id: "inv1",
      quantityOnHand: 5,
      product: {},
      warehouse: {},
    });
    prismaMock.stockMovement.create.mockResolvedValue({});

    const result = await inventoryService.adjustInventory(
      {
        productId: "p1",
        warehouseId: "w1",
        outletId: "o1",
        quantity: 5,
        type: "ADJUSTMENT_IN",
      },
      "user-1",
      businessId,
    );

    expect(result.id).toBe("inv1");
    expect(prismaMock.inventory.create.calls.length).toBeGreaterThan(0);
    expect(prismaMock.inventory.update.calls.length).toBeGreaterThan(0);
    expect(prismaMock.stockMovement.create.calls.length).toBeGreaterThan(0);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBeGreaterThan(0);
  });

  it("throws when transferring with same warehouse or insufficient stock", async () => {
    await expect(
      inventoryService.transferInventory(
        {
          productId: "p1",
          fromWarehouseId: "w1",
          toWarehouseId: "w1",
          outletId: "o1",
          quantity: 1,
        },
        "user",
        businessId,
      ),
    ).rejects.toThrow("Cannot transfer to the same warehouse");

    prismaMock.inventory.findUnique.mockResolvedValue({ quantityOnHand: 1 });
    await expect(
      inventoryService.transferInventory(
        {
          productId: "p1",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          outletId: "o1",
          quantity: 5,
        },
        "user",
        businessId,
      ),
    ).rejects.toThrow("Insufficient inventory for transfer");
  });

  it("fetches low stock inventory using raw queries", async () => {
    let call = 0;
    prismaMock.$queryRawUnsafe.mockImplementation(async () => {
      call += 1;
      if (call === 1) return [{ count: 2 }];
      if (call === 2) return [{ id: "inv1" }];
      return [];
    });
    prismaMock.inventory.findMany.mockResolvedValue([
      {
        id: "inv1",
        product: {},
        warehouse: { outlet: {} },
      },
    ]);

    const result = await inventoryService.getInventory(
      {
        lowStock: true,
        page: 1,
        limit: 1,
      },
      businessId,
    );

    expect(prismaMock.$queryRawUnsafe.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.inventories.length).toBe(1);
    expect(result.pagination.total).toBe(2);
  });

  it("fetches inventory with filters without low stock", async () => {
    prismaMock.inventory.findMany.mockResolvedValue([{ id: "inv1" }]);
    prismaMock.inventory.count.mockResolvedValue(1);

    const result = await inventoryService.getInventory(
      {
        productId: "p1",
        warehouseId: "w1",
        outletId: "out1",
        page: 2,
        limit: 5,
      },
      businessId,
    );

    const args = prismaMock.inventory.findMany.calls[0][0];
    expect(args.where.productId).toBe("p1");
    expect(args.skip).toBe(5);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("constructs correct raw query for low stock with all filters", async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ count: 0 }]); // simplifies validation, we only check call args

    await inventoryService.getInventory(
      {
        lowStock: true,
        productId: "p1", // matches mocked product p1
        warehouseId: "ware1",
        outletId: "out1",
      },
      businessId,
    );

    const calls = prismaMock.$queryRawUnsafe.calls;
    // Should be called twice (count + ids)
    expect(calls.length).toBeGreaterThanOrEqual(1);

    const querySql = calls[0][0];
    const queryParams = calls[0].slice(1);

    expect(querySql).toContain("i.product_id = $");
    expect(querySql).toContain("i.warehouse_id = $");
    expect(querySql).toContain("w.outlet_id = $");
    // Parameters order might vary but they should be present
    expect(queryParams).toContain("p1");
    expect(queryParams).toContain("ware1");
    expect(queryParams).toContain("out1");
  });

  it("fetches stock movements filtered by product and outlet", async () => {
    prismaMock.stockMovement.findMany.mockResolvedValue([]);
    prismaMock.stockMovement.count.mockResolvedValue(0);

    await inventoryService.getStockMovements(
      {
        productId: "p1",
        outletId: "o1",
        type: "SALE",
      },
      businessId,
    );

    const args = prismaMock.stockMovement.findMany.calls[0][0];
    expect(args.where.productId).toBe("p1");
    expect(args.where.outletId).toBe("o1");
    expect(args.where.type).toBe("SALE");
  });

  it("throws when source inventory missing for transfer", async () => {
    prismaMock.inventory.findUnique.mockImplementation(async () => null);

    await expect(
      inventoryService.transferInventory(
        {
          productId: "p1",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          outletId: "o1",
          quantity: 1,
        },
        "user",
        businessId,
      ),
    ).rejects.toThrow("Source inventory not found");
  });

  it("transfers inventory successfully and enqueues audit log", async () => {
    // First call: source inventory, second: destination inventory missing
    let findCount = 0;
    prismaMock.inventory.findUnique.mockImplementation(async () => {
      findCount += 1;
      if (findCount === 1)
        return { productId: "p1", warehouseId: "w1", quantityOnHand: 10 };
      return null;
    });
    prismaMock.inventory.update.mockResolvedValue({ id: "inv-updated" });
    prismaMock.inventory.create.mockResolvedValue({ id: "inv-new" });
    prismaMock.stockMovement.create.mockResolvedValue({});

    const res = await inventoryService.transferInventory(
      {
        productId: "p1",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
        outletId: "o1",
        quantity: 5,
      },
      "user-1",
      businessId,
    );

    expect(res.source.id).toBe("inv-updated");
    expect(prismaMock.stockMovement.create.calls.length).toBe(1);
    expect(jobsMock.enqueueAuditLogJob.calls.length).toBe(1);
    expect(loggerMock.info.calls.length).toBe(1);
  });

  it("fetches stock movements with filters", async () => {
    prismaMock.stockMovement.findMany.mockResolvedValue([
      { id: "m1", productId: "p1" },
    ]);
    prismaMock.stockMovement.count.mockResolvedValue(1);

    const result = await inventoryService.getStockMovements(
      {
        warehouseId: "w1",
        type: "SALE",
        page: 1,
        limit: 10,
      },
      businessId,
    );

    expect(result.movements.length).toBe(1);
    const whereArg = prismaMock.stockMovement.findMany.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
  });

  it("throws when businessId is missing in getInventory", async () => {
    await expect(inventoryService.getInventory({})).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when product not found or belongs to another business in getInventory (normal)", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p2",
      businessId: "other",
    });
    await expect(
      inventoryService.getInventory({ productId: "p2" }, businessId),
    ).rejects.toThrow("Product not found");
  });

  it("throws when product not found or belongs to another business in getInventory (lowStock)", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p2",
      businessId: "other",
    });
    await expect(
      inventoryService.getInventory(
        { productId: "p2", lowStock: true },
        businessId,
      ),
    ).rejects.toThrow("Product not found");
  });

  it("throws when businessId is missing in adjustInventory", async () => {
    await expect(inventoryService.adjustInventory({}, "user")).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when product not found or belongs to another business in adjustInventory", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p2",
      businessId: "other",
    });
    await expect(
      inventoryService.adjustInventory({ productId: "p2" }, "user", businessId),
    ).rejects.toThrow("Product not found");
  });

  it("throws when businessId is missing in transferInventory", async () => {
    await expect(
      inventoryService.transferInventory({}, "user"),
    ).rejects.toThrow("businessId is required");
  });

  it("throws when product not found or belongs to another business in transferInventory", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p2",
      businessId: "other",
    });
    await expect(
      inventoryService.transferInventory(
        { productId: "p2" },
        "user",
        businessId,
      ),
    ).rejects.toThrow("Product not found");
  });

  it("throws when businessId is missing in getStockMovements", async () => {
    await expect(inventoryService.getStockMovements({})).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when product not found or belongs to another business in getStockMovements", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p2",
      businessId: "other",
    });
    await expect(
      inventoryService.getStockMovements({ productId: "p2" }, businessId),
    ).rejects.toThrow("Product not found");
  });
});
