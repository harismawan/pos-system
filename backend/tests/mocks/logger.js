import { createMockFn } from "./mockFn.js";

export function createLoggerMock() {
  return {
    info: createMockFn(),
    error: createMockFn(),
    warn: createMockFn(),
    debug: createMockFn(),
    child: createMockFn(() => createLoggerMock()),
  };
}
