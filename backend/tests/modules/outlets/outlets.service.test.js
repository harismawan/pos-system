import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { resolve } from "path";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const jobsMock = { enqueueAuditLogJob: createMockFn() };

// Use absolute path to ensure specific mocking
mock.module(resolve(import.meta.dir, "../../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));

mock.module("../../../src/libs/jobs.js", () => jobsMock);

const outletsService =
  await import("../../../src/modules/outlets/outlets.service.js?real");

const businessId = "biz-1";

describe("modules/outlets/outlets.service", () => {
  beforeEach(() => {
    prismaMock.outlet.findMany?.mockReset?.();
    prismaMock.outlet.count?.mockReset?.();
    prismaMock.outlet.count?.mockReset?.();
    prismaMock.outlet.create?.mockReset?.();
    prismaMock.outlet.update?.mockReset?.();
    prismaMock.outlet.findUnique?.mockReset?.();
    prismaMock.outletUser.delete?.mockReset?.();
    prismaMock.outletUser.findMany?.mockReset?.();
    prismaMock.outletUser.updateMany?.mockReset?.();
    prismaMock.outletUser.upsert?.mockReset?.();
    prismaMock.posOrder.count?.mockReset?.();
    jobsMock.enqueueAuditLogJob.mockReset?.();
  });

  it("lists outlets with filters and pagination", async () => {
    prismaMock.outlet.findMany.mockResolvedValue([{ id: "o1" }]);
    prismaMock.outlet.count.mockResolvedValue(1);

    const res = await outletsService.getOutlets({
      isActive: true,
      page: 2,
      limit: 5,
      businessId,
    });

    const args = prismaMock.outlet.findMany.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.where.businessId).toBe(businessId);
    expect(args.skip).toBe(5);
    expect(res.pagination.totalPages).toBe(1);
  });

  it("returns outlet by id with relations", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      outletUsers: [],
      businessId,
    });

    const outlet = await outletsService.getOutletById("o1", businessId);
    expect(outlet.id).toBe("o1");
    const args = prismaMock.outlet.findUnique.calls[0][0];
    expect(args.include.outletUsers.include.user.select.username).toBe(true);
  });

  it("throws when outlet not found", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue(null);
    await expect(
      outletsService.getOutletById("missing", businessId),
    ).rejects.toThrow("Outlet not found");
  });

  it("prevents deleting outlets with existing orders", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
    prismaMock.posOrder.count.mockImplementation(async () => 5);

    await expect(
      outletsService.deleteOutlet("out-1", businessId),
    ).rejects.toThrow("Cannot delete outlet with existing orders");
  });

  it("unsets other defaults when assigning default outlet user", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
    prismaMock.outletUser.upsert.mockImplementation(async (args) => ({
      id: "ou-1",
      ...args.data,
    }));

    const result = await outletsService.assignUserToOutlet(
      {
        userId: "u1",
        outletId: "o1",
        outletRole: "MANAGER",
        isDefaultForUser: true,
      },
      "admin-1",
      businessId,
    );

    expect(prismaMock.outletUser.updateMany.calls.length).toBeGreaterThan(0);
    expect(result.id).toBe("ou-1");
  });

  it("assigns outlet user without changing defaults when not requested", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
    prismaMock.outletUser.upsert.mockResolvedValue({ id: "ou-2" });

    const res = await outletsService.assignUserToOutlet(
      {
        userId: "u1",
        outletId: "o1",
        outletRole: "STAFF",
        isDefaultForUser: false,
      },
      "admin",
      businessId,
    );

    expect(res.id).toBe("ou-2");
    expect(prismaMock.outletUser.updateMany.calls.length).toBe(0);
  });

  it("creates an outlet and enqueues audit log", async () => {
    prismaMock.outlet.create.mockResolvedValue({ id: "o1", outletId: "o1" });
    const result = await outletsService.createOutlet(
      { name: "Outlet", outletId: "o1" },
      "admin",
      businessId,
    );
    expect(result.id).toBe("o1");
  });

  it("updates an outlet and enqueues audit log", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
    prismaMock.outlet.update.mockResolvedValue({
      id: "o1",
      outletId: "o1",
      name: "Updated",
    });
    const result = await outletsService.updateOutlet(
      "o1",
      { name: "Updated" },
      "admin",
      businessId,
    );
    expect(result.name).toBe("Updated");
  });

  it("removes user from outlet", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
    prismaMock.outletUser.delete.mockResolvedValue({ id: "ou1" });
    const res = await outletsService.removeUserFromOutlet(
      "u1",
      "o1",
      "admin",
      businessId,
    );
    expect(res.message).toBe("User removed from outlet successfully");
  });

  it("deletes outlet when no orders exist", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "o1", businessId });
    prismaMock.posOrder.count.mockResolvedValue(0);
    prismaMock.outlet.delete.mockResolvedValue({});

    const res = await outletsService.deleteOutlet("o1", businessId);

    expect(res.message).toMatch(/deleted/);
    expect(prismaMock.outlet.delete.calls[0][0].where.id).toBe("o1");
  });

  it("gets outlet users", async () => {
    prismaMock.outletUser.findMany.mockResolvedValue([{ id: "ou1" }]);
    const users = await outletsService.getOutletUsers("o1", businessId);
    expect(users.length).toBe(1);
  });

  it("throws when businessId is missing in getOutlets", async () => {
    await expect(outletsService.getOutlets({})).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when businessId is missing in getOutletById", async () => {
    await expect(outletsService.getOutletById("o1")).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when accessing outlet from another business in getOutletById", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      businessId: "other",
    });
    await expect(
      outletsService.getOutletById("o1", businessId),
    ).rejects.toThrow("Outlet not found");
  });

  it("throws when businessId is missing in createOutlet", async () => {
    await expect(outletsService.createOutlet({}, "u1", null)).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when businessId is missing in updateOutlet", async () => {
    await expect(
      outletsService.updateOutlet("o1", {}, "u1", null),
    ).rejects.toThrow("businessId is required");
  });

  it("throws when updating outlet from another business", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      businessId: "other",
    });
    await expect(
      outletsService.updateOutlet("o1", {}, "u1", businessId),
    ).rejects.toThrow("Outlet not found");
  });

  it("throws when businessId is missing in deleteOutlet", async () => {
    await expect(outletsService.deleteOutlet("o1", null)).rejects.toThrow(
      "businessId is required",
    );
  });

  it("throws when deleting outlet from another business", async () => {
    prismaMock.outlet.findUnique.mockResolvedValue({
      id: "o1",
      businessId: "other",
    });
    await expect(outletsService.deleteOutlet("o1", businessId)).rejects.toThrow(
      "Outlet not found",
    );
  });
});
