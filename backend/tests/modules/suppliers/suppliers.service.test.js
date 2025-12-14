import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { resolve } from "path";
import { createPrismaMock } from "../../mocks/prisma.js";

const prismaMock = createPrismaMock();

// Use absolute path to ensure specific mocking
mock.module(resolve(import.meta.dir, "../../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));

const suppliersService =
  await import("../../../src/modules/suppliers/suppliers.service.js?real");

const businessId = "biz-1";

describe("modules/suppliers/suppliers.service", () => {
  beforeEach(() => {
    prismaMock.supplier.findMany.mockReset?.();
    prismaMock.supplier.count.mockReset?.();
    prismaMock.supplier.findUnique.mockReset?.();
    prismaMock.supplier.create.mockReset?.();
    prismaMock.supplier.update.mockReset?.();
    prismaMock.supplier.delete.mockReset?.();
    prismaMock.purchaseOrder.count.mockReset?.();
  });

  it("lists suppliers with filters and pagination", async () => {
    prismaMock.supplier.findMany.mockResolvedValue([{ id: "s1" }]);
    prismaMock.supplier.count.mockResolvedValue(1);

    const res = await suppliersService.getSuppliers({
      search: "abc",
      isActive: true,
      page: 2,
      limit: 5,
      businessId,
    });

    const args = prismaMock.supplier.findMany.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.where.businessId).toBe(businessId);
    expect(args.where.OR.length).toBeGreaterThan(0);
    expect(args.skip).toBe(5);
    expect(res.pagination.totalPages).toBe(1);
    expect(res.suppliers[0].id).toBe("s1");
  });

  it("returns supplier with related purchase orders", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({
      id: "s1",
      purchaseOrders: [],
      businessId,
    });

    const supplier = await suppliersService.getSupplierById("s1", businessId);

    expect(supplier.id).toBe("s1");
    const args = prismaMock.supplier.findUnique.calls[0][0];
    expect(args.include.purchaseOrders.include.warehouse).toBe(true);
  });

  it("creates supplier", async () => {
    prismaMock.supplier.create.mockResolvedValue({ id: "new" });

    const supplier = await suppliersService.createSupplier(
      { name: "Test" },
      businessId,
    );

    expect(supplier.id).toBe("new");
    expect(prismaMock.supplier.create.calls[0][0].data.name).toBe("Test");
    expect(prismaMock.supplier.create.calls[0][0].data.businessId).toBe(
      businessId,
    );
  });

  it("updates supplier", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: "s1", businessId });
    prismaMock.supplier.update.mockResolvedValue({ id: "s1", name: "Updated" });

    const supplier = await suppliersService.updateSupplier(
      "s1",
      {
        name: "Updated",
      },
      businessId,
    );

    expect(supplier.name).toBe("Updated");
    expect(prismaMock.supplier.update.calls[0][0].where.id).toBe("s1");
  });

  it("prevents deleting suppliers with purchase orders", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({
      id: "sup-1",
      businessId,
    });
    prismaMock.purchaseOrder.count.mockImplementation(async () => 3);

    await expect(
      suppliersService.deleteSupplier("sup-1", businessId),
    ).rejects.toThrow("Cannot delete supplier with existing purchase orders");
  });

  it("throws when supplier is not found", async () => {
    prismaMock.supplier.findUnique.mockImplementation(async () => null);

    await expect(
      suppliersService.getSupplierById("missing", businessId),
    ).rejects.toThrow("Supplier not found");
  });

  it("deletes supplier when there are no purchase orders", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({
      id: "sup-1",
      businessId,
    });
    prismaMock.purchaseOrder.count.mockResolvedValue(0);
    prismaMock.supplier.delete.mockResolvedValue({});

    const res = await suppliersService.deleteSupplier("sup-1", businessId);

    expect(res.message).toMatch(/deleted/i);
    expect(prismaMock.supplier.delete.calls[0][0].where.id).toBe("sup-1");
    expect(res.message).toMatch(/deleted/i);
    expect(prismaMock.supplier.delete.calls[0][0].where.id).toBe("sup-1");
  });

  describe("Validation & Error Handling", () => {
    it("throws when businessId is missing in getSuppliers", async () => {
      await expect(suppliersService.getSuppliers({})).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when businessId is missing in getSupplierById", async () => {
      await expect(suppliersService.getSupplierById("s1")).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when supplier missing or cross-business in getSupplierById", async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "s1",
        businessId: "other",
      });
      await expect(
        suppliersService.getSupplierById("s1", businessId),
      ).rejects.toThrow("Supplier not found");
    });

    it("throws when businessId is missing in createSupplier", async () => {
      await expect(suppliersService.createSupplier({}, null)).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when businessId is missing in updateSupplier", async () => {
      await expect(
        suppliersService.updateSupplier("s1", {}, null),
      ).rejects.toThrow("businessId is required");
    });

    it("throws when supplier missing or cross-business in updateSupplier", async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "s1",
        businessId: "other",
      });
      await expect(
        suppliersService.updateSupplier("s1", {}, businessId),
      ).rejects.toThrow("Supplier not found");
    });

    it("throws when businessId is missing in deleteSupplier", async () => {
      await expect(suppliersService.deleteSupplier("s1", null)).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws when supplier missing or cross-business in deleteSupplier", async () => {
      prismaMock.supplier.findUnique.mockResolvedValue({
        id: "s1",
        businessId: "other",
      });
      await expect(
        suppliersService.deleteSupplier("s1", businessId),
      ).rejects.toThrow("Supplier not found");
    });
  });
});
