import { describe, it, expect } from "bun:test";

// Import setupMocks first to apply mocks
import "./setupMocks.js";

describe("tests/setupMocks", () => {
  it("mocks Redis methods correctly", async () => {
    const { default: redis } = await import("../src/libs/redis.js");

    // Verify default return values from setupMocks
    expect(await redis.get("key")).toBeNull();
    expect(await redis.set("key", "value")).toBe("OK");
    expect(await redis.del("key")).toBe(1);
    expect(await redis.expire("key", 10)).toBe(1);
    expect(await redis.ping()).toBe("PONG");
  });

  it("mocks Prisma methods correctly", async () => {
    const { default: prisma } = await import("../src/libs/prisma.js");

    // Verify default return values from setupMocks
    expect(await prisma.$connect()).toBeUndefined();
    expect(await prisma.$disconnect()).toBeUndefined();

    // Setup specific mock implementations for user methods just to verify they are mocks
    // Note: The structure in setupMocks is basic, we just want to ensure we can call them
    // and they are indeed the mocked functions from setupMocks

    // We expect these to be mock functions
    expect(prisma.$on).toBeDefined();
    expect(prisma.user.findUnique).toBeDefined();
    expect(prisma.user.findFirst).toBeDefined();
    expect(prisma.user.findMany).toBeDefined();
    expect(prisma.user.create).toBeDefined();
    expect(prisma.user.update).toBeDefined();
    expect(prisma.user.delete).toBeDefined();
  });

  it("mocks Logger methods correctly", async () => {
    const { default: logger } = await import("../src/libs/logger.js");

    // These should be callable without error
    expect(logger.info("info")).toBeUndefined();
    expect(logger.error("error")).toBeUndefined();
    expect(logger.warn("warn")).toBeUndefined();
    expect(logger.debug("debug")).toBeUndefined();
  });

  it("mocks Logger.child() correctly", async () => {
    const { default: logger } = await import("../src/libs/logger.js");

    const childLogger = logger.child({ module: "test" });
    expect(childLogger).toBeDefined();
    expect(childLogger.info("child info")).toBeUndefined();
    expect(childLogger.error("child error")).toBeUndefined();
    expect(childLogger.warn("child warn")).toBeUndefined();
    expect(childLogger.debug("child debug")).toBeUndefined();
  });
});
