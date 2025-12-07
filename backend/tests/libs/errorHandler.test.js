import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import { globalErrorHandler } from "../../src/libs/errorHandler.js";
import { GEN } from "../../src/libs/responseCodes.js";

const baseContext = {
  request: { id: "req-1", url: "/test", method: "GET" },
};

describe("libs/errorHandler", () => {
  it("handles validation errors with 400 status", () => {
    const set = {};
    const result = globalErrorHandler({
      ...baseContext,
      code: "VALIDATION",
      error: new Error("Invalid input"),
      set,
    });

    expect(set.status).toBe(400);
    expect(result.code).toBe(GEN.VALIDATION_FAILED);
  });

  it("handles not found errors with 404 status", () => {
    const set = {};
    const result = globalErrorHandler({
      ...baseContext,
      code: "NOT_FOUND",
      error: new Error("Not found"),
      set,
    });

    expect(set.status).toBe(404);
    expect(result.code).toBe(GEN.ROUTE_NOT_FOUND);
  });

  it("returns internal error for unexpected issues", () => {
    const set = {};
    const result = globalErrorHandler({
      ...baseContext,
      code: "UNKNOWN",
      error: new Error("Boom"),
      set,
    });

    expect(set.status).toBe(500);
    expect(result.code).toBe(GEN.INTERNAL_ERROR);
    expect(result.error).toBe("Boom");
  });
});
