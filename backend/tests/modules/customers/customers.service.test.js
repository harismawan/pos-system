import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { resolve } from "path";
import { createPrismaMock } from "../../mocks/prisma.js";

const prismaMock = createPrismaMock();

// Use absolute path to ensure specific mocking
mock.module(resolve(import.meta.dir, "../../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));

const customersService =
  await import("../../../src/modules/customers/customers.service.js?test");

describe("modules/customers/customers.service", () => {
  beforeEach(() => {
    prismaMock.customer.findMany.mockReset?.();
    prismaMock.customer.count.mockReset?.();
    prismaMock.customer.findUnique.mockReset?.();
    prismaMock.posOrder.count.mockReset?.();
    prismaMock.customer.delete.mockReset?.();
    prismaMock.customer.create?.mockReset?.();
    prismaMock.customer.update?.mockReset?.();
  });

  it("lists customers with filters and pagination", async () => {
    prismaMock.customer.findMany.mockResolvedValue([
      { id: "c1", businessId: "biz-1" },
    ]);
    prismaMock.customer.count.mockResolvedValue(1);

    const res = await customersService.getCustomers({
      search: "abc",
      priceTierId: "tier1",
      isMember: true,
      page: 2,
      limit: 5,
      businessId: "biz-1",
    });

    const args = prismaMock.customer.findMany.calls[0][0];
    expect(args.where.priceTierId).toBe("tier1");
    expect(args.skip).toBe(5);
    expect(res.pagination.totalPages).toBe(1);
  });

  it("returns customer by id with relations", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: "c1",
      businessId: "biz-1",
      priceTier: {},
    });

    const customer = await customersService.getCustomerById("c1", "biz-1");
    expect(customer.id).toBe("c1");
    const args = prismaMock.customer.findUnique.calls[0][0];
    expect(args.include.posOrders.orderBy.createdAt).toBe("desc");
  });

  it("prevents deleting customers with existing orders", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: "cust-1",
      businessId: "biz-1",
    });
    prismaMock.posOrder.count.mockResolvedValue(2);
    let deletionCalled = false;
    prismaMock.customer.delete.mockImplementation(async () => {
      deletionCalled = true;
      return { message: "ok" };
    });

    const err = await customersService
      .deleteCustomer("cust-1", "biz-1")
      .catch((e) => e);
    expect(prismaMock.posOrder.count.calls.length).toBeGreaterThan(0);
    expect(deletionCalled).toBe(false);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain(
      "Cannot delete customer with existing orders",
    );
  });

  it("deletes customer successfully when no orders exist", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: "c1",
      businessId: "biz-1",
    });
    prismaMock.posOrder.count.mockResolvedValue(0);
    prismaMock.customer.delete.mockResolvedValue({
      id: "c1",
      businessId: "biz-1",
    });

    const result = await customersService.deleteCustomer("c1", "biz-1");

    const countArgs = prismaMock.posOrder.count.calls[0][0];
    expect(countArgs.where.customerId).toBe("c1");

    const deleteArgs = prismaMock.customer.delete.calls[0][0];
    expect(deleteArgs.where.id).toBe("c1");

    expect(result).toEqual({ message: "Customer deleted successfully" });
  });

  it("throws when customer is not found", async () => {
    prismaMock.customer.findUnique.mockImplementation(async () => null);

    await expect(
      customersService.getCustomerById("missing", "biz-1"),
    ).rejects.toThrow("Customer not found");
  });

  it("creates a customer successfully", async () => {
    prismaMock.customer.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: "new",
    }));

    const result = await customersService.createCustomer(
      { name: "New" },
      "biz-1",
    );
    expect(result.id).toBe("new");
  });

  it("updates a customer successfully", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: "c1",
      businessId: "biz-1",
    });
    prismaMock.customer.update.mockImplementation(async ({ data, where }) => ({
      ...data,
      ...where,
    }));

    const result = await customersService.updateCustomer(
      "c1",
      {
        name: "Updated",
      },
      "biz-1",
    );
    expect(result.name).toBe("Updated");
  });

  it("throws when businessId is missing in getCustomers", async () => {
    await expect(customersService.getCustomers({})).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when businessId is missing in getCustomerById", async () => {
    await expect(customersService.getCustomerById("c1")).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when accessing customer from another business", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: "c1",
      businessId: "other",
    });
    await expect(
      customersService.getCustomerById("c1", "biz-1"),
    ).rejects.toThrow("Customer not found");
  });

  it("throws when businessId is missing in createCustomer", async () => {
    await expect(customersService.createCustomer({}, null)).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when businessId is missing in updateCustomer", async () => {
    await expect(
      customersService.updateCustomer("c1", {}, null),
    ).rejects.toThrow("businessId is required");
  });

  it("throws when updating customer from another business", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: "c1",
      businessId: "other",
    });
    await expect(
      customersService.updateCustomer("c1", {}, "biz-1"),
    ).rejects.toThrow("Customer not found");
  });

  it("throws when businessId is missing in deleteCustomer", async () => {
    await expect(customersService.deleteCustomer("c1", null)).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when deleting customer from another business", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({
      id: "c1",
      businessId: "other",
    });
    await expect(
      customersService.deleteCustomer("c1", "biz-1"),
    ).rejects.toThrow("Customer not found");
  });
});
