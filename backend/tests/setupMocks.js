import { mock, beforeAll, afterAll } from "bun:test";

// Mock Redis
mock.module("../src/libs/redis.js", () => {
  return {
    default: {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve("OK")),
      del: mock(() => Promise.resolve(1)),
      expire: mock(() => Promise.resolve(1)),
      ping: mock(() => Promise.resolve("PONG")),
      // Add other Redis methods as needed
    },
  };
});

// Mock Prisma
mock.module("../src/libs/prisma.js", () => {
  return {
    default: {
      $connect: mock(() => Promise.resolve()),
      $disconnect: mock(() => Promise.resolve()),
      $on: mock(),
      user: {
        findUnique: mock(),
        findFirst: mock(),
        findMany: mock(),
        create: mock(),
        update: mock(),
        delete: mock(),
      },
      // We'll add a catch-all proxy later or specific models as we discover them
      // For now, let's just mock the basics to prevent connection errors
    },
  };
});

// Mock Pino Logger to reduce noise
mock.module("../src/libs/logger.js", () => {
  return {
    default: {
      info: mock(),
      error: mock(),
      warn: mock(),
      debug: mock(),
      child: mock(() => ({
        info: mock(),
        error: mock(),
        warn: mock(),
        debug: mock(),
      })),
    },
  };
});

// Mocks applied
