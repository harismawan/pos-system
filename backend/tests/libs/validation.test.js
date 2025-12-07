import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import {
  commonSchemas,
  paginatedResponse,
  addressFields,
} from "../../src/libs/validation.js";

describe("libs/validation", () => {
  it("validates decimal pattern", () => {
    const decimalRegex = new RegExp(commonSchemas.decimal.pattern);
    expect(decimalRegex.test("10")).toBe(true);
    expect(decimalRegex.test("10.25")).toBe(true);
    expect(decimalRegex.test("10.256")).toBe(false);
    expect(decimalRegex.test("abc")).toBe(false);
  });

  it("builds paginated response schema shape", () => {
    const schema = paginatedResponse({ type: "object" });
    expect(schema.properties.data.properties.pagination).toBeDefined();
    expect(schema.properties.data.properties.items.type).toBe("array");
  });

  it("exposes address field validators as optional strings", () => {
    expect(addressFields.addressLine1.type).toBe("string");
    expect(addressFields.addressLine1.maxLength).toBe(255);
  });
});
