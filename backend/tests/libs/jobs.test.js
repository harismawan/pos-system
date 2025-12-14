import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createRedisMock } from "../mocks/redis.js";
import { createLoggerMock } from "../mocks/logger.js";

const redisMock = createRedisMock();
const loggerMock = createLoggerMock();

mock.module("../../src/libs/redis.js", () => ({ default: redisMock }));
mock.module("../../src/libs/logger.js", () => ({ default: loggerMock }));

const jobs = await import("../../src/libs/jobs.js");

describe("libs/jobs", () => {
  beforeEach(() => {
    redisMock.lpush.mockReset?.();
    loggerMock.debug.mockReset?.();
    loggerMock.error.mockReset?.();
  });

  it("enqueues audit log jobs with generated ids", async () => {
    redisMock.lpush.mockImplementation(async () => 1);
    const jobId = jobs.enqueueAuditLogJob({ hello: "world" });

    expect(jobId).toBeDefined();
    expect(redisMock.lpush.calls.length).toBeGreaterThan(0);

    const [queueName, payload] = redisMock.lpush.calls[0];
    expect(queueName).toBe(jobs.QUEUES.AUDIT_LOG);
    const parsed = JSON.parse(payload);
    expect(parsed.id).toBe(jobId);
    expect(parsed.type).toBe("AUDIT_LOG");
    expect(parsed.payload).toEqual({ hello: "world" });
    expect(parsed.maxAttempts).toBe(3);
    await new Promise((resolve) => setImmediate(resolve));
    expect(loggerMock.debug.calls.length).toBe(1);
  });

  it("merges impersonatedBy into payload for audit logs", async () => {
    redisMock.lpush.mockReset();
    redisMock.lpush.mockImplementation(async () => 1);

    const auditData = {
      payload: { action: "update" },
      impersonatedBy: "admin-1",
    };

    jobs.enqueueAuditLogJob(auditData);

    const [, payload] = redisMock.lpush.calls[0];
    const parsed = JSON.parse(payload);

    expect(parsed.payload.payload).toEqual({
      action: "update",
      impersonatedBy: "admin-1",
    });
  });

  it("supports other job types", async () => {
    redisMock.lpush.mockReset();
    redisMock.lpush.mockImplementation(async () => 1);

    const emailJob = jobs.enqueueEmailNotificationJob({ to: "a@b.com" });
    const reportJob = jobs.enqueueReportJob({ reportType: "SALES" });

    expect(emailJob).toBeDefined();
    expect(reportJob).toBeDefined();
    expect(redisMock.lpush.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("logs error when enqueue fails", async () => {
    redisMock.lpush.mockImplementation(async () => {
      throw new Error("redis down");
    });
    const jobId = jobs.enqueueReportJob({ reportType: "DAILY" });
    expect(jobId).toBeDefined();
    await new Promise((resolve) => setImmediate(resolve));
    expect(loggerMock.error.calls.length).toBe(1);
    const [logArgs] = loggerMock.error.calls[0];
    expect(logArgs.queueName).toBe(jobs.QUEUES.REPORT_GENERATION);
  });

  it("creates audit log data from store and options", () => {
    const store = {
      user: { id: "u1", businessId: "b1", impersonatedBy: "admin" },
      outletId: "o1",
    };
    const options = {
      eventType: "TEST",
      entityType: "THING",
      entityId: "t1",
      payload: { foo: "bar" },
    };

    const data = jobs.createAuditLogData(store, options);

    expect(data).toEqual({
      eventType: "TEST",
      businessId: "b1",
      userId: "u1",
      outletId: "o1",
      entityType: "THING",
      entityId: "t1",
      payload: { foo: "bar" },
      impersonatedBy: "admin",
    });
  });
});
