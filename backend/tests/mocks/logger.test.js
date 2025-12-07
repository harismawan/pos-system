import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import { createLoggerMock } from "./logger.js";

describe("tests/mocks/logger", () => {
  it("tracks calls for log levels", () => {
    const logger = createLoggerMock();
    logger.info("hello", { a: 1 });
    logger.error("oops");

    expect(logger.info.calls[0]).toEqual(["hello", { a: 1 }]);
    expect(logger.error.calls[0][0]).toBe("oops");
  });

  it("provides child logger with independent call tracking", () => {
    const logger = createLoggerMock();
    const child = logger.child({ name: "child" });
    child.debug("child-msg");
    expect(logger.debug.calls.length).toBe(0);
    expect(child.debug.calls[0][0]).toBe("child-msg");
  });

  it("resets recorded calls with mockReset", () => {
    const logger = createLoggerMock();
    logger.warn("warn");
    expect(logger.warn.calls.length).toBe(1);
    logger.warn.mockReset();
    expect(logger.warn.calls.length).toBe(0);
  });
});
