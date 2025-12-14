import { createMockFn } from "./mockFn.js";

export function createRedisMock() {
  return {
    ping: createMockFn(async () => "PONG"),
    get: createMockFn(async () => null),
    setex: createMockFn(async () => true),
    exists: createMockFn(async () => true),
    del: createMockFn(async () => true),
    keys: createMockFn(async () => []),
    lpush: createMockFn(async () => 1),
    hset: createMockFn(async () => 1),
    expire: createMockFn(async () => 1),
    hgetall: createMockFn(async () => ({})),
    ttl: createMockFn(async () => 3600),
  };
}
