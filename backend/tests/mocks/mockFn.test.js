import { describe, it, expect } from "bun:test";
import { createMockFn } from "./mockFn.js";

describe("mocks/mockFn", () => {
  it("uses default implementation if provided", () => {
    const fn = createMockFn(() => "default");
    expect(fn()).toBe("default");
  });

  it("uses undefined as default implementation if not provided", () => {
    const fn = createMockFn();
    expect(fn()).toBeUndefined();
  });

  it("tracks calls", () => {
    const fn = createMockFn();
    fn("arg1", "arg2");
    expect(fn.calls.length).toBe(1);
    expect(fn.calls[0]).toEqual(["arg1", "arg2"]);
  });

  it("mockImplementation updates implementation", () => {
    const fn = createMockFn();
    fn.mockImplementation(() => "new");
    expect(fn()).toBe("new");
  });

  it("mockImplementationOnce runs once then falls back", () => {
    const fn = createMockFn(() => "default");
    fn.mockImplementationOnce(() => "once");
    expect(fn()).toBe("once");
    expect(fn()).toBe("default");
  });

  it("mockReturnValue sets return value", () => {
    const fn = createMockFn();
    fn.mockReturnValue("val");
    expect(fn()).toBe("val");
  });

  it("mockResolvedValue sets resolved value", async () => {
    const fn = createMockFn();
    fn.mockResolvedValue("resolved");
    expect(await fn()).toBe("resolved");
  });

  it("mockResolvedValueOnce sets resolved value once", async () => {
    const fn = createMockFn(async () => "default");
    fn.mockResolvedValueOnce("once");
    expect(await fn()).toBe("once");
    expect(await fn()).toBe("default");
  });

  it("mockResolvedValueOnce allows chaining", async () => {
    const fn = createMockFn(async () => "default");
    fn.mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    expect(await fn()).toBe("first");
    expect(await fn()).toBe("second");
    expect(await fn()).toBe("default");
  });

  it("mockRejectedValue sets rejected value", async () => {
    const fn = createMockFn();
    const error = new Error("fail");
    fn.mockRejectedValue(error);
    await expect(fn()).rejects.toThrow("fail");
  });

  it("mockReset clears calls and resets implementation", () => {
    const fn = createMockFn(() => "initial");
    fn("call1");
    fn.mockImplementationOnce(() => "once");

    fn.mockReset();

    expect(fn.calls.length).toBe(0);
    expect(fn()).toBeUndefined(); // Resets to undefined implementation
  });
});
