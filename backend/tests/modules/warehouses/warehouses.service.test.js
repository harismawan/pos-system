import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { resolve } from "path";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createLoggerMock } from "../../mocks/logger.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const loggerMock = createLoggerMock();
const jobsMock = { enqueueAuditLogJob: createMockFn() };

// Use absolute path to ensure specific mocking
mock.module(resolve(import.meta.dir, "../../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const warehousesService =
  await import("../../../src/modules/warehouses/warehouses.service.js?controllers");

describe("modules/warehouses/warehouses.service", () => {
  beforeEach(() => {
    prismaMock.warehouse.findMany.mockReset?.();
    prismaMock.warehouse.count.mockReset?.();
    prismaMock.warehouse.findUnique.mockReset?.();
    prismaMock.inventory.count.mockReset?.();
    prismaMock.inventory.findMany.mockReset?.();
    prismaMock.warehouse.create.mockReset?.();
    prismaMock.warehouse.update.mockReset?.();
    prismaMock.warehouse.updateMany.mockReset?.();
    prismaMock.warehouse.delete.mockReset?.();
    prismaMock.outlet.findUnique?.mockReset?.();
    prismaMock.outletUser?.updateMany?.mockReset?.();
    prismaMock.outletUser?.upsert?.mockReset?.();
    prismaMock.$queryRawUnsafe.mockReset?.();
    jobsMock.enqueueAuditLogJob.mockReset?.();
  });

  it("lists warehouses with filters and pagination", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "out1",
      businessId: "biz-1",
    });
    prismaMock.warehouse.findMany.mockResolvedValue([
      { id: "w1", outlet: { businessId: "biz-1" } },
    ]);
    prismaMock.warehouse.count.mockResolvedValue(1);

    const res = await warehousesService.getWarehouses(
      {
        outletId: "out1",
        type: "STORE",
        isActive: true,
        page: 2,
        limit: 5,
      },
      "biz-1",
    );

    const args = prismaMock.warehouse.findMany.calls[0][0];
    expect(args.where).toEqual({
      outletId: "out1",
      type: "STORE",
      isActive: true,
      outlet: {
        businessId: "biz-1",
      },
    });
    expect(args.skip).toBe(5);
    expect(res.pagination.totalPages).toBe(1);
  });

  it("returns warehouse by id with inventories", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "biz-1" },
      inventories: [],
    });

    const warehouse = await warehousesService.getWarehouseById("w1", "biz-1");
    expect(warehouse.id).toBe("w1");
    const args = prismaMock.warehouse.findUnique.calls[0][0];
    expect(args.include.inventories.include.product).toBe(true);
  });

  it("throws when warehouse not found", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue(null);
    await expect(
      warehousesService.getWarehouseById("missing", "biz-1"),
    ).rejects.toThrow("Warehouse not found");
  });

  it("prevents deleting warehouses with existing inventory", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "biz-1" },
    });
    prismaMock.inventory.count.mockImplementation(async () => 2);

    await expect(
      warehousesService.deleteWarehouse("w1", "biz-1"),
    ).rejects.toThrow("Cannot delete warehouse with existing inventory");
  });

  it("unsets other defaults when creating a default warehouse", async () => {
    let unsetCalled = false;
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      businessId: "biz-1",
    });
    prismaMock.warehouse.updateMany.mockImplementation(async () => {
      unsetCalled = true;
      return {};
    });
    prismaMock.warehouse.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: "w1",
    }));

    const result = await warehousesService.createWarehouse(
      {
        name: "Main",
        outletId: "o1",
        isDefault: true,
      },
      "user-1",
      "biz-1",
    );

    expect(unsetCalled).toBe(true);
    expect(result.id).toBe("w1");
  });

  it("creates warehouse without changing defaults when not requested", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      businessId: "biz-1",
    });
    prismaMock.warehouse.create.mockResolvedValue({
      id: "w2",
      outletId: "o1",
      name: "Secondary",
    });

    const res = await warehousesService.createWarehouse(
      { name: "Secondary", outletId: "o1", isDefault: false },
      "admin",
      "biz-1",
    );

    expect(prismaMock.warehouse.updateMany.calls.length).toBe(0);
    expect(res.id).toBe("w2");
  });

  it("updates warehouse and unsets other defaults when needed", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "biz-1" },
      outletId: "o1",
    });
    prismaMock.warehouse.updateMany.mockResolvedValue({});
    prismaMock.warehouse.update.mockResolvedValue({
      id: "w1",
      outletId: "o1",
      name: "Updated",
    });

    const res = await warehousesService.updateWarehouse(
      "w1",
      { isDefault: true, name: "Updated" },
      "admin",
      "biz-1",
    );

    expect(res.name).toBe("Updated");
    expect(prismaMock.warehouse.updateMany.calls.length).toBe(1);
  });

  it("deletes warehouse when no inventory exists", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "biz-1" },
    });
    prismaMock.inventory.count.mockResolvedValue(0);
    prismaMock.warehouse.delete.mockResolvedValue({});

    const res = await warehousesService.deleteWarehouse("w1", "biz-1");

    expect(res.message).toMatch(/deleted/);
    expect(prismaMock.warehouse.delete.calls[0][0].where.id).toBe("w1");
  });

  it("gets warehouse inventory with low stock filter using raw queries", async () => {
    let rawCall = 0;
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "biz-1" },
    });
    prismaMock.$queryRawUnsafe.mockImplementation(async () => {
      rawCall += 1;
      return rawCall === 1 ? [{ count: 2 }] : [{ id: "inv1" }, { id: "inv2" }];
    });
    prismaMock.inventory.findMany.mockResolvedValue([
      { id: "inv1" },
      { id: "inv2" },
    ]);

    const res = await warehousesService.getWarehouseInventory(
      "w1",
      {
        lowStock: true,
        page: 1,
        limit: 10,
      },
      "biz-1",
    );

    expect(res.pagination.total).toBe(2);
    expect(prismaMock.inventory.findMany.calls[0][0].where.id.in).toEqual([
      "inv1",
      "inv2",
    ]);
  });

  it("gets warehouse inventory without low stock filter", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "biz-1" },
    });
    prismaMock.inventory.findMany.mockResolvedValue([{ id: "inv1" }]);
    prismaMock.inventory.count.mockResolvedValue(1);

    const res = await warehousesService.getWarehouseInventory(
      "w1",
      {
        page: 2,
        limit: 5,
      },
      "biz-1",
    );

    const args = prismaMock.inventory.findMany.calls[0][0];
    expect(args.where.warehouseId).toBe("w1");
    expect(args.skip).toBe(5);
    expect(res.pagination.totalPages).toBe(1);
  });
});

describe("Validation & Error Handling", () => {
  it("throws when businessId is missing in getWarehouses", async () => {
    await expect(warehousesService.getWarehouses({})).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when filtering by outlet from another business in getWarehouses", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      businessId: "other",
    });
    await expect(
      warehousesService.getWarehouses({ outletId: "o1" }, "biz-1"),
    ).rejects.toThrow("Outlet not found");
  });

  it("throws when businessId is missing in getWarehouseById", async () => {
    await expect(warehousesService.getWarehouseById("w1")).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when warehouse belongs to another business in getWarehouseById", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "other" },
    });
    await expect(
      warehousesService.getWarehouseById("w1", "biz-1"),
    ).rejects.toThrow("Warehouse not found");
  });

  it("throws when businessId is missing in createWarehouse", async () => {
    await expect(warehousesService.createWarehouse({}, "u1")).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when creating warehouse for cross-business outlet", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      businessId: "other",
    });
    await expect(
      warehousesService.createWarehouse({ outletId: "o1" }, "u1", "biz-1"),
    ).rejects.toThrow("Outlet not found");
  });

  it("throws when businessId is missing in updateWarehouse", async () => {
    await expect(
      warehousesService.updateWarehouse("w1", {}, "u1"),
    ).rejects.toThrow("businessId is required");
  });

  it("throws when updating cross-business warehouse", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "other" },
    });
    await expect(
      warehousesService.updateWarehouse("w1", {}, "u1", "biz-1"),
    ).rejects.toThrow("Warehouse not found");
  });

  it("throws when businessId is missing in deleteWarehouse", async () => {
    await expect(warehousesService.deleteWarehouse("w1")).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when deleting cross-business warehouse", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "other" },
    });
    await expect(
      warehousesService.deleteWarehouse("w1", "biz-1"),
    ).rejects.toThrow("Warehouse not found");
  });

  it("throws when businessId is missing in getWarehouseInventory", async () => {
    await expect(
      warehousesService.getWarehouseInventory("w1", {}),
    ).rejects.toThrow("businessId is required");
  });

  it("throws when getting inventory for cross-business warehouse", async () => {
    prismaMock.warehouse.findUnique.mockResolvedValue({
      id: "w1",
      outlet: { businessId: "other" },
    });
    await expect(
      warehousesService.getWarehouseInventory("w1", {}, "biz-1"),
    ).rejects.toThrow("Warehouse not found");
  });
});
