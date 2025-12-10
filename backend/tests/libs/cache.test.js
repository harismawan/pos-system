import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createRedisMock } from "../mocks/redis.js";

const redisMock = createRedisMock();

// Mock redis before importing cache module
mock.module("../../src/libs/redis.js", () => ({ default: redisMock }));

// Import cache module - use unique query string per test file to avoid conflicts
// but this is the file that actually tests the real cache.js implementation
const {
  hashObject,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  wrapWithCache,
  CACHE_KEYS,
  CACHE_TTL,
} = await import("../../src/libs/cache.js");

describe("libs/cache", () => {
  beforeEach(() => {
    redisMock.get.mockReset?.();
    redisMock.setex.mockReset?.();
    redisMock.del.mockReset?.();
    redisMock.keys.mockReset?.();
  });

  describe("CACHE_TTL", () => {
    it("has correct TTL values", () => {
      expect(CACHE_TTL.PRODUCT_DETAIL).toBe(300);
      expect(CACHE_TTL.PRODUCT_LIST).toBe(60);
      expect(CACHE_TTL.REPORT_SUMMARY).toBe(300);
      expect(CACHE_TTL.REPORT_TREND).toBe(600);
      expect(CACHE_TTL.REPORT_HEATMAP).toBe(900);
      expect(CACHE_TTL.REPORT_TOP_PRODUCTS).toBe(300);
    });
  });

  describe("CACHE_KEYS", () => {
    it("generates product by ID key", () => {
      const key = CACHE_KEYS.PRODUCT_BY_ID("prod-123");
      expect(key).toBe("cache:product:prod-123");
    });

    it("generates products list key", () => {
      const key = CACHE_KEYS.PRODUCTS_LIST("abc123");
      expect(key).toBe("cache:products:list:abc123");
    });

    it("generates report sales trend key", () => {
      const key = CACHE_KEYS.REPORT_SALES_TREND("hash123");
      expect(key).toBe("cache:report:trend:hash123");
    });

    it("generates report heatmap key", () => {
      const key = CACHE_KEYS.REPORT_HEATMAP("hash456");
      expect(key).toBe("cache:report:heatmap:hash456");
    });

    it("generates report top products key", () => {
      const key = CACHE_KEYS.REPORT_TOP_PRODUCTS("hash789");
      expect(key).toBe("cache:report:topproducts:hash789");
    });

    it("generates report inventory key", () => {
      const key = CACHE_KEYS.REPORT_INVENTORY("hashABC");
      expect(key).toBe("cache:report:inventory:hashABC");
    });

    it("generates report stock movements key", () => {
      const key = CACHE_KEYS.REPORT_STOCK_MOVEMENTS("hashDEF");
      expect(key).toBe("cache:report:stockmovements:hashDEF");
    });
  });

  describe("hashObject", () => {
    it("creates consistent hash for same object", () => {
      const hash1 = hashObject({ a: 1, b: 2 });
      const hash2 = hashObject({ b: 2, a: 1 });
      expect(hash1).toBe(hash2);
    });

    it("creates different hash for different objects", () => {
      const hash1 = hashObject({ a: 1 });
      const hash2 = hashObject({ a: 2 });
      expect(hash1).not.toBe(hash2);
    });

    it("returns 12 character hash", () => {
      const hash = hashObject({ test: "value" });
      expect(hash.length).toBe(12);
    });
  });

  describe("getCache", () => {
    it("returns parsed JSON value on cache hit", async () => {
      redisMock.get.mockResolvedValue(JSON.stringify({ id: "test" }));

      const result = await getCache("test-key");

      expect(result).toEqual({ id: "test" });
      expect(redisMock.get.calls[0][0]).toBe("test-key");
    });

    it("returns null on cache miss", async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await getCache("missing-key");

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      redisMock.get.mockRejectedValue(new Error("Redis error"));

      const result = await getCache("error-key");

      expect(result).toBeNull();
    });

    it("returns null on JSON parse error", async () => {
      redisMock.get.mockResolvedValue("invalid-json{");

      const result = await getCache("bad-json-key");

      expect(result).toBeNull();
    });
  });

  describe("setCache", () => {
    it("sets value with TTL", async () => {
      await setCache("test-key", { data: "value" }, 300);

      expect(redisMock.setex.calls[0][0]).toBe("test-key");
      expect(redisMock.setex.calls[0][1]).toBe(300);
      expect(redisMock.setex.calls[0][2]).toBe(
        JSON.stringify({ data: "value" }),
      );
    });

    it("does not throw on error", async () => {
      redisMock.setex.mockRejectedValue(new Error("Redis error"));

      await expect(setCache("key", "value", 60)).resolves.toBeUndefined();
    });

    it("handles complex objects", async () => {
      const complexObj = { nested: { data: [1, 2, 3] }, array: ["a", "b"] };
      await setCache("complex", complexObj, 120);

      expect(redisMock.setex.calls[0][2]).toBe(JSON.stringify(complexObj));
    });
  });

  describe("deleteCache", () => {
    it("deletes a single key", async () => {
      await deleteCache("test-key");

      expect(redisMock.del.calls[0][0]).toBe("test-key");
    });

    it("does not throw on error", async () => {
      redisMock.del.mockRejectedValue(new Error("Redis error"));

      await expect(deleteCache("key")).resolves.toBeUndefined();
    });
  });

  describe("deleteCachePattern", () => {
    it("deletes all keys matching pattern", async () => {
      redisMock.keys.mockResolvedValue(["key:1", "key:2"]);

      await deleteCachePattern("key:*");

      expect(redisMock.keys.calls[0][0]).toBe("key:*");
      expect(redisMock.del.calls[0]).toEqual(["key:1", "key:2"]);
    });

    it("does not call del when no keys match", async () => {
      redisMock.keys.mockResolvedValue([]);

      await deleteCachePattern("nonexistent:*");

      expect(redisMock.del.calls.length).toBe(0);
    });

    it("does not throw on error", async () => {
      redisMock.keys.mockRejectedValue(new Error("Redis error"));

      await expect(deleteCachePattern("pattern:*")).resolves.toBeUndefined();
    });
  });

  describe("wrapWithCache", () => {
    it("returns cached value on hit", async () => {
      redisMock.get.mockResolvedValue(JSON.stringify({ cached: true }));

      const fetchFn = async () => ({ fresh: true });
      const result = await wrapWithCache("key", 60, fetchFn);

      expect(result).toEqual({ cached: true });
    });

    it("fetches and caches on miss", async () => {
      redisMock.get.mockResolvedValue(null);

      const fetchFn = async () => ({ fresh: true });
      const result = await wrapWithCache("key", 60, fetchFn);

      expect(result).toEqual({ fresh: true });
      expect(redisMock.setex.calls[0][0]).toBe("key");
      expect(redisMock.setex.calls[0][2]).toBe(JSON.stringify({ fresh: true }));
    });

    it("does not cache null values", async () => {
      redisMock.get.mockResolvedValue(null);

      const fetchFn = async () => null;
      const result = await wrapWithCache("key", 60, fetchFn);

      expect(result).toBeNull();
      expect(redisMock.setex.calls.length).toBe(0);
    });

    it("does not cache undefined values", async () => {
      redisMock.get.mockResolvedValue(null);

      const fetchFn = async () => undefined;
      const result = await wrapWithCache("key", 60, fetchFn);

      expect(result).toBeUndefined();
      expect(redisMock.setex.calls.length).toBe(0);
    });

    it("handles fetchFn errors gracefully", async () => {
      redisMock.get.mockResolvedValue(null);

      const fetchFn = async () => {
        throw new Error("Fetch failed");
      };

      await expect(wrapWithCache("key", 60, fetchFn)).rejects.toThrow(
        "Fetch failed",
      );
    });
  });
});
