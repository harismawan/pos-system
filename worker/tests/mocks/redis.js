import { createMockFn } from "./mockFn.js";

export function createRedisMock() {
  return {
    ping: createMockFn(async () => "PONG"),
    get: createMockFn(async () => null),
    set: createMockFn(async () => true),
    setex: createMockFn(async () => true),
    del: createMockFn(async () => true),
    exists: createMockFn(async () => true),
    keys: createMockFn(async () => []),
    lpush: createMockFn(async () => 1),
    brpop: createMockFn(async () => null),
    llen: createMockFn(async () => 0),
    quit: createMockFn(async () => undefined),
    // Cache tracking methods (wrapper interface)
    recordCacheHit: createMockFn(() => {}),
    recordCacheMiss: createMockFn(() => {}),
  };
}
