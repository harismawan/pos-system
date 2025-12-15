import { describe, it, expect, beforeEach } from "bun:test";
import { createRedisMock } from "./redis.js";

describe("Redis Mock", () => {
  let mockRedis;

  beforeEach(() => {
    mockRedis = createRedisMock();
  });

  it("should store and retrieve values", async () => {
    await mockRedis.set("key1", "value1");
    const val = await mockRedis.get("key1");
    expect(val).toBe("value1");
  });

  it("should return null for missing keys", async () => {
    const val = await mockRedis.get("missing");
    expect(val).toBeNull();
  });

  it("should delete values", async () => {
    await mockRedis.set("key1", "value1");
    await mockRedis.del("key1");
    const val = await mockRedis.get("key1");
    expect(val).toBeNull();
  });

  it("should check existence", async () => {
    await mockRedis.set("key1", "value1");
    expect(await mockRedis.exists("key1")).toBe(1);
    expect(await mockRedis.exists("missing")).toBe(0);
  });

  it("should handle list operations", async () => {
    // LPUSH prepends
    await mockRedis.lpush("list1", "a", "b");
    // list is now [b, a]

    const len = await mockRedis.llen("list1");
    expect(len).toBe(2);

    const res = await mockRedis.brpop("list1", 0);
    // BRPOP removes from tail, so 'a'
    expect(res).toEqual(["list1", "a"]);

    const res2 = await mockRedis.brpop("list1", 0);
    // remaining 'b'
    expect(res2).toEqual(["list1", "b"]);

    const res3 = await mockRedis.brpop("list1", 0);
    expect(res3).toBeNull();
  });

  it("should list keys with pattern", async () => {
    await mockRedis.set("user:1", "u1");
    await mockRedis.set("user:2", "u2");
    await mockRedis.set("product:1", "p1");

    const all = await mockRedis.keys("*");
    expect(all).toHaveLength(3);

    const users = await mockRedis.keys("user:*");
    expect(users).toHaveLength(2);
    expect(users).toContain("user:1");
    expect(users).toContain("user:2");

    const exact = await mockRedis.keys("user:1");
    expect(exact).toHaveLength(1);
    expect(exact[0]).toBe("user:1");
  });

  it("should handle setex (ttl ignored)", async () => {
    await mockRedis.setex("key_ttl", 60, "value_ttl");
    const val = await mockRedis.get("key_ttl");
    expect(val).toBe("value_ttl");
  });

  it("should clear store", async () => {
    await mockRedis.set("k", "v");
    await mockRedis.lpush("l", "v");

    // Verify internal accessors work
    expect(mockRedis._getStore().size).toBe(1);
    expect(mockRedis._getLists().size).toBe(1);

    mockRedis._clear();

    expect(await mockRedis.get("k")).toBeNull();
    expect(await mockRedis.llen("l")).toBe(0);
    expect(mockRedis._getStore().size).toBe(0);
  });

  it("should allow calling no-op methods", async () => {
    expect(await mockRedis.ping()).toBe("PONG");
    await mockRedis.quit();
    mockRedis.recordCacheHit("op");
    mockRedis.recordCacheMiss("op");
    expect(true).toBe(true);
  });
});
