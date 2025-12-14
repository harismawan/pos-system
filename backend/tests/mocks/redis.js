import { createMockFn } from "./mockFn.js";

export function createRedisMock() {
  return {
    ping: createMockFn(async () => "PONG"),
    get: createMockFn(async () => null),
    setex: createMockFn(async () => true),
    set: createMockFn(async () => true),
    exists: createMockFn(async () => true),
    del: createMockFn(async () => true),
    keys: createMockFn(async () => []),
    lpush: createMockFn(async () => 1),
    hset: createMockFn(async () => 1),
    hget: createMockFn(async () => null),
    hgetall: createMockFn(async () => ({})),
    expire: createMockFn(async () => 1),
    ttl: createMockFn(async () => 3600),
    // Cache tracking methods (new wrapper interface)
    recordCacheHit: createMockFn(() => {}),
    recordCacheMiss: createMockFn(() => {}),
  };
}
