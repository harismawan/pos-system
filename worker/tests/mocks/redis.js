import { createMockFn } from "./mockFn.js";

export function createRedisMock() {
  return {
    ping: createMockFn(async () => "PONG"),
    lpush: createMockFn(async () => 1),
    brpop: createMockFn(async () => null),
    quit: createMockFn(async () => undefined),
  };
}
