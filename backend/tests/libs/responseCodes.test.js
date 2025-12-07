import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import * as codes from "../../src/libs/responseCodes.js";

describe("libs/responseCodes", () => {
  it("contains expected auth codes", () => {
    expect(codes.AUT.LOGIN_SUCCESS).toBe("AUT-200-001");
    expect(codes.AUT.INVALID_CREDENTIALS).toBe("AUT-401-001");
  });

  it("does not reuse general codes", () => {
    const values = Object.values(codes.GEN);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
