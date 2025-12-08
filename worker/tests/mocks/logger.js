import { createMockFn } from "./mockFn.js";

export const loggerMock = {
  info: createMockFn(() => undefined),
  debug: createMockFn(() => undefined),
  warn: createMockFn(() => undefined),
  error: createMockFn(() => undefined),
  child: createMockFn(() => loggerMock),
};

export default loggerMock;
