import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import { createRedisMock } from "./redis.js";

describe("tests/mocks/redis", () => {
  it("provides mock methods with call tracking", async () => {
    const redis = createRedisMock();
    await redis.ping();
    await redis.setex("key", 10, "val");
    await redis.exists("key");
    await redis.del("key1", "key2");
    await redis.keys("pattern:*");
    await redis.lpush("queue", "item");

    expect(redis.ping.calls.length).toBe(1);
    expect(redis.setex.calls[0]).toEqual(["key", 10, "val"]);
    expect(redis.exists.calls[0][0]).toBe("key");
    expect(redis.del.calls[0]).toEqual(["key1", "key2"]);
    expect(redis.keys.calls[0][0]).toBe("pattern:*");
    expect(redis.lpush.calls[0]).toEqual(["queue", "item"]);
  });

  it("supports mockReset on functions", async () => {
    const redis = createRedisMock();
    await redis.ping();
    expect(redis.ping.calls.length).toBe(1);
    redis.ping.mockReset();
    expect(redis.ping.calls.length).toBe(0);
  });

  it("get returns null by default", async () => {
    const redis = createRedisMock();
    const result = await redis.get("key");
    expect(result).toBeNull();
  });
});
