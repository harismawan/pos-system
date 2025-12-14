import { resolve } from "path";
import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../mocks/prisma.js";
import { loggerMock } from "../mocks/logger.js";

const prismaMock = createPrismaMock();

mock.module(resolve(import.meta.dir, "../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));
mock.module(resolve(import.meta.dir, "../../src/libs/logger.js"), () => ({
  default: loggerMock,
}));

const { handleAuditLogJob } =
  await import("../../src/jobs/auditLog.job.js?real");

describe("jobs/auditLog", () => {
  beforeEach(() => {
    prismaMock.auditLog.create.mockReset?.();
    loggerMock.info.mockReset?.();
    loggerMock.error.mockReset?.();
  });

  it("creates audit log entry successfully", async () => {
    const mockAuditLog = { id: "audit-1" };
    prismaMock.auditLog.create.mockResolvedValue(mockAuditLog);

    const payload = {
      eventType: "ORDER_CREATED",
      businessId: "business-1",
      userId: "user-1",
      outletId: "outlet-1",
      entityType: "PosOrder",
      entityId: "order-1",
      payload: { orderNumber: "ORD-001" },
    };

    await handleAuditLogJob(payload);

    expect(prismaMock.auditLog.create.calls.length).toBe(1);
    expect(prismaMock.auditLog.create.calls[0][0].data).toEqual({
      eventType: "ORDER_CREATED",
      businessId: "business-1",
      userId: "user-1",
      outletId: "outlet-1",
      entityType: "PosOrder",
      entityId: "order-1",
      payload: { orderNumber: "ORD-001" },
    });
    expect(loggerMock.info.calls.length).toBeGreaterThan(0);
  });

  it("throws and logs error when prisma fails", async () => {
    const error = new Error("Database error");
    prismaMock.auditLog.create.mockRejectedValue(error);

    const payload = {
      eventType: "ORDER_CREATED",
      userId: "user-1",
      entityType: "PosOrder",
      entityId: "order-1",
      payload: {},
    };

    await expect(handleAuditLogJob(payload)).rejects.toThrow("Database error");
    expect(loggerMock.error.calls.length).toBeGreaterThan(0);
  });
});
