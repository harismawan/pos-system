import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import { createMockFn } from "./mockFn.js";
import { createPrismaMock } from "./prisma.js";
import { createRedisMock } from "./redis.js";
import { createEmailMock } from "./email.js";
import { loggerMock } from "./logger.js";

describe("mocks/mockFn", () => {
  it("tracks function calls", () => {
    const fn = createMockFn();
    fn("arg1", "arg2");
    fn("arg3");

    expect(fn.calls.length).toBe(2);
    expect(fn.calls[0]).toEqual(["arg1", "arg2"]);
    expect(fn.calls[1]).toEqual(["arg3"]);
  });

  it("uses default implementation", () => {
    const fn = createMockFn(() => "default");
    expect(fn()).toBe("default");
  });

  it("mockImplementation changes behavior", () => {
    const fn = createMockFn();
    fn.mockImplementation(() => "new impl");
    expect(fn()).toBe("new impl");
  });

  it("mockReturnValue returns fixed value", () => {
    const fn = createMockFn();
    fn.mockReturnValue("fixed");
    expect(fn()).toBe("fixed");
  });

  it("mockResolvedValue returns promise", async () => {
    const fn = createMockFn();
    fn.mockResolvedValue("async value");
    expect(await fn()).toBe("async value");
  });

  it("mockRejectedValue throws error", async () => {
    const fn = createMockFn();
    fn.mockRejectedValue(new Error("test error"));
    await expect(fn()).rejects.toThrow("test error");
  });

  it("mockReset clears calls and implementation", () => {
    const fn = createMockFn(() => "original");
    fn("call1");
    fn.mockReturnValue("changed");
    fn.mockReset();

    expect(fn.calls.length).toBe(0);
    expect(fn()).toBeUndefined();
  });
});

describe("mocks/prisma", () => {
  it("creates prisma mock with all models", async () => {
    const prisma = createPrismaMock();

    expect(typeof prisma.auditLog.create).toBe("function");
    expect(typeof prisma.auditLog.findMany).toBe("function");
    expect(typeof prisma.posOrder.findMany).toBe("function");
    expect(typeof prisma.inventory.findMany).toBe("function");
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });

  it("mock functions return expected defaults", async () => {
    const prisma = createPrismaMock();

    expect(await prisma.auditLog.create()).toEqual({});
    expect(await prisma.auditLog.findMany()).toEqual([]);
    expect(await prisma.posOrder.findMany()).toEqual([]);
    expect(await prisma.inventory.findMany()).toEqual([]);
    expect(await prisma.$connect()).toBeUndefined();
    expect(await prisma.$disconnect()).toBeUndefined();
  });
});

describe("mocks/redis", () => {
  it("creates redis mock with all methods", async () => {
    const redis = createRedisMock();

    expect(await redis.ping()).toBe("PONG");
    expect(await redis.lpush("queue", "item")).toBe(1);
    expect(await redis.brpop()).toBeNull();
    expect(await redis.quit()).toBeUndefined();
  });
});

describe("mocks/email", () => {
  it("creates email mock with sendEmail", async () => {
    const email = createEmailMock();

    const result = await email.sendEmail({
      to: "test@example.com",
      subject: "Test",
    });

    expect(result.messageId).toBe("mock-message-id");
    expect(email.sendEmail.calls.length).toBe(1);
  });
});

describe("mocks/logger", () => {
  it("has all log methods", () => {
    expect(typeof loggerMock.info).toBe("function");
    expect(typeof loggerMock.debug).toBe("function");
    expect(typeof loggerMock.warn).toBe("function");
    expect(typeof loggerMock.error).toBe("function");
    expect(typeof loggerMock.child).toBe("function");
  });

  it("log methods are callable", () => {
    loggerMock.info("test info");
    loggerMock.debug("test debug");
    loggerMock.warn("test warn");
    loggerMock.error("test error");

    expect(loggerMock.info.calls.length).toBeGreaterThan(0);
  });

  it("child returns logger", () => {
    const child = loggerMock.child({ module: "test" });
    expect(typeof child.info).toBe("function");
  });
});
