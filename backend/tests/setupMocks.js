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
import { createPrismaMock } from "./mocks/prisma.js";
import { resolve } from "path";

// Use absolute path to ensure all imports of prisma.js get mocked
mock.module(resolve(import.meta.dir, "../src/libs/prisma.js"), () => {
  return {
    default: createPrismaMock(),
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
