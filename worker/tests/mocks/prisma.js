import { createMockFn } from "./mockFn.js";

export function createPrismaMock() {
  return {
    auditLog: {
      create: createMockFn(async () => ({})),
      findMany: createMockFn(async () => []),
    },
    posOrder: {
      findMany: createMockFn(async () => []),
    },
    inventory: {
      findMany: createMockFn(async () => []),
    },
    $connect: createMockFn(async () => undefined),
    $disconnect: createMockFn(async () => undefined),
  };
}
