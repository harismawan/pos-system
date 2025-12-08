import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import { createCacheMock } from "./cache.js";

describe("mocks/cache", () => {
  it("creates cache mock with all required functions", () => {
    const cacheMock = createCacheMock();

    expect(typeof cacheMock.getCache).toBe("function");
    expect(typeof cacheMock.setCache).toBe("function");
    expect(typeof cacheMock.deleteCache).toBe("function");
    expect(typeof cacheMock.deleteCachePattern).toBe("function");
    expect(typeof cacheMock.wrapWithCache).toBe("function");
    expect(typeof cacheMock.hashObject).toBe("function");
  });

  it("getCache returns null by default", async () => {
    const cacheMock = createCacheMock();
    const result = await cacheMock.getCache("key");
    expect(result).toBeNull();
  });

  it("setCache resolves to undefined", async () => {
    const cacheMock = createCacheMock();
    const result = await cacheMock.setCache("key", "value", 60);
    expect(result).toBeUndefined();
  });

  it("deleteCache resolves to undefined", async () => {
    const cacheMock = createCacheMock();
    const result = await cacheMock.deleteCache("key");
    expect(result).toBeUndefined();
  });

  it("deleteCachePattern resolves to undefined", async () => {
    const cacheMock = createCacheMock();
    const result = await cacheMock.deleteCachePattern("pattern:*");
    expect(result).toBeUndefined();
  });

  it("wrapWithCache calls the provided function", async () => {
    const cacheMock = createCacheMock();
    const fn = async () => "fetched-value";
    const result = await cacheMock.wrapWithCache("key", 60, fn);
    expect(result).toBe("fetched-value");
  });

  it("hashObject returns mock hash", () => {
    const cacheMock = createCacheMock();
    const result = cacheMock.hashObject({ a: 1 });
    expect(result).toBe("mock-hash");
  });

  it("CACHE_TTL has expected values", () => {
    const cacheMock = createCacheMock();
    expect(cacheMock.CACHE_TTL.PRODUCT_DETAIL).toBe(300);
    expect(cacheMock.CACHE_TTL.PRODUCT_LIST).toBe(60);
  });

  it("CACHE_KEYS generates correct patterns", () => {
    const cacheMock = createCacheMock();
    expect(cacheMock.CACHE_KEYS.PRODUCT_BY_ID("p1")).toBe("cache:product:p1");
    expect(cacheMock.CACHE_KEYS.PRODUCTS_LIST("abc")).toBe(
      "cache:products:list:abc",
    );
  });
});
