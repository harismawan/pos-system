import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createPrismaMock } from "../../mocks/prisma.js";

const prismaMock = createPrismaMock();

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));

const auditLogsService =
  await import("../../../src/modules/auditLogs/auditLogs.service.js?service");

describe("modules/auditLogs/auditLogs.service", () => {
  beforeEach(() => {
    prismaMock.auditLog.findMany.mockReset?.();
    prismaMock.auditLog.count.mockReset?.();
    prismaMock.auditLog.findUnique.mockReset?.();
    prismaMock.user.findMany.mockReset?.();
    prismaMock.user.findUnique.mockReset?.();
  });

  it("applies date filters when fetching audit logs", async () => {
    prismaMock.auditLog.findMany.mockImplementation(async () => [
      { id: "1", userId: "u1", createdAt: new Date().toISOString() },
    ]);
    prismaMock.auditLog.count.mockImplementation(async () => 1);
    prismaMock.user.findMany.mockImplementation(async () => [
      { id: "u1", name: "User", username: "user" },
    ]);

    const result = await auditLogsService.getAuditLogs({
      startDate: "2024-01-01",
      endDate: "2024-02-01",
      page: 1,
      limit: 10,
    });

    expect(
      prismaMock.auditLog.findMany.calls[0][0].where.createdAt,
    ).toBeDefined();
    expect(result.logs[0].user?.id).toBe("u1");
    expect(result.pagination.total).toBe(1);
  });

  it("applies other filters and paginates audit logs", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([{ id: "2", userId: null }]);
    prismaMock.auditLog.count.mockResolvedValue(2);
    prismaMock.user.findMany.mockResolvedValue([]);

    const res = await auditLogsService.getAuditLogs({
      eventType: "USER_CREATED",
      entityType: "User",
      userId: "u1",
      outletId: "out1",
      page: 2,
      limit: 5,
    });

    const args = prismaMock.auditLog.findMany.calls[0][0];
    expect(args.where.userId).toBe("u1");
    expect(args.where.outletId).toBe("out1");
    expect(args.skip).toBe(5);
    expect(res.logs[0].user).toBeNull();
    expect(res.pagination.totalPages).toBe(1);
  });

  it("returns audit log with user info by id", async () => {
    prismaMock.auditLog.findUnique.mockResolvedValue({
      id: "log1",
      userId: "u1",
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", name: "Test" });

    const log = await auditLogsService.getAuditLogById("log1");

    expect(log.user.id).toBe("u1");
    expect(prismaMock.user.findUnique.calls.length).toBe(1);
  });

  it("throws when audit log is not found", async () => {
    prismaMock.auditLog.findUnique.mockImplementation(async () => null);

    await expect(auditLogsService.getAuditLogById("missing")).rejects.toThrow(
      "Audit log not found",
    );
  });

  it("returns event types list", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([
      { eventType: "A" },
      { eventType: "B" },
    ]);

    const types = await auditLogsService.getEventTypes();

    expect(types).toEqual(["A", "B"]);
  });

  it("returns entity types list", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([
      { entityType: "User" },
      { entityType: "Order" },
    ]);

    const types = await auditLogsService.getEntityTypes();

    expect(types).toEqual(["User", "Order"]);
  });
});
