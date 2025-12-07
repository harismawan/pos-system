import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import { successResponse, errorResponse } from "../../src/libs/responses.js";

describe("libs/responses", () => {
  it("wraps data in a success response shape", () => {
    const data = { id: 1 };
    const result = successResponse("CODE-200", data);
    expect(result).toEqual({
      success: true,
      code: "CODE-200",
      data,
    });
  });

  it("wraps error messages and optional details", () => {
    const result = errorResponse("CODE-400", "Bad request", { field: "name" });
    expect(result).toEqual({
      success: false,
      code: "CODE-400",
      error: "Bad request",
      details: { field: "name" },
    });
  });

  it("omits details when not provided", () => {
    const result = errorResponse("CODE-400", "Bad request");
    expect(result).toEqual({
      success: false,
      code: "CODE-400",
      error: "Bad request",
    });
  });
});
