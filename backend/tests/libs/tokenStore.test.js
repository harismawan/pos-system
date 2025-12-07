import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import crypto from "crypto";
import { createRedisMock } from "../mocks/redis.js";
import { createLoggerMock } from "../mocks/logger.js";

const redisMock = createRedisMock();
const loggerMock = createLoggerMock();

mock.module("../../src/libs/redis.js", () => ({ default: redisMock }));
mock.module("../../src/libs/logger.js", () => ({ default: loggerMock }));

const tokenStore = await import("../../src/libs/tokenStore.js");

describe("libs/tokenStore", () => {
  const token = "token-123";
  const userId = "user-1";
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  beforeEach(() => {
    redisMock.setex.mockReset?.();
    redisMock.exists.mockReset?.();
    redisMock.del.mockReset?.();
    redisMock.keys.mockReset?.();
    loggerMock.error.mockReset?.();
    loggerMock.debug.mockReset?.();
  });

  it("stores access tokens with hashed keys and TTL", async () => {
    await tokenStore.storeAccessToken(userId, token, 60);
    expect(redisMock.setex.calls[0]).toEqual([
      `token:access:${userId}:${tokenHash}`,
      60,
      "1",
    ]);
  });

  it("stores refresh tokens with hashed keys and TTL", async () => {
    await tokenStore.storeRefreshToken(userId, token, 120);
    expect(redisMock.setex.calls[0]).toEqual([
      `token:refresh:${userId}:${tokenHash}`,
      120,
      "1",
    ]);
    expect(loggerMock.debug.calls.length).toBe(1);
  });

  it("logs and rethrows when storing tokens fails", async () => {
    redisMock.setex.mockImplementation(async () => {
      throw new Error("redis down");
    });
    await expect(tokenStore.storeAccessToken(userId, token, 1)).rejects.toThrow(
      "redis down",
    );
    expect(loggerMock.error.calls.length).toBe(1);
  });

  it("logs and rethrows when storing refresh token fails", async () => {
    redisMock.setex.mockImplementation(async () => {
      throw new Error("refresh fail");
    });
    await expect(
      tokenStore.storeRefreshToken(userId, token, 1),
    ).rejects.toThrow("refresh fail");
    expect(loggerMock.error.calls.length).toBe(1);
  });

  it("validates access tokens using hashed keys", async () => {
    redisMock.exists.mockImplementation(async () => true);
    const isValid = await tokenStore.validateAccessToken(userId, token);
    expect(isValid).toBe(true);
    expect(redisMock.exists.calls[0]).toEqual([
      `token:access:${userId}:${tokenHash}`,
    ]);
  });

  it("returns false when access token validation errors", async () => {
    redisMock.exists.mockImplementation(async () => {
      throw new Error("boom");
    });
    const isValid = await tokenStore.validateAccessToken(userId, token);
    expect(isValid).toBe(false);
    expect(loggerMock.debug.calls.length).toBe(1);
  });

  it("validates refresh tokens using hashed keys", async () => {
    redisMock.exists.mockResolvedValue(true);
    const isValid = await tokenStore.validateRefreshToken(userId, token);
    expect(isValid).toBe(true);
    expect(redisMock.exists.calls[0]).toEqual([
      `token:refresh:${userId}:${tokenHash}`,
    ]);
  });

  it("returns false when refresh token validation errors", async () => {
    redisMock.exists.mockImplementation(async () => {
      throw new Error("fail");
    });
    const isValid = await tokenStore.validateRefreshToken(userId, token);
    expect(isValid).toBe(false);
    expect(loggerMock.debug.calls.length).toBe(1);
  });

  it("revokes access and refresh tokens", async () => {
    await tokenStore.revokeAccessToken(userId, token);
    expect(redisMock.del.calls[0]).toEqual([
      `token:access:${userId}:${tokenHash}`,
    ]);

    await tokenStore.revokeRefreshToken(userId, token);
    expect(redisMock.del.calls[1]).toEqual([
      `token:refresh:${userId}:${tokenHash}`,
    ]);
  });

  it("rethrows on revoke errors and logs error", async () => {
    redisMock.del.mockImplementation(async () => {
      throw new Error("del fail");
    });
    await expect(tokenStore.revokeAccessToken(userId, token)).rejects.toThrow(
      "del fail",
    );
    expect(loggerMock.error.calls.length).toBe(1);
  });

  it("logs and rethrows when revoking refresh token fails", async () => {
    redisMock.del.mockImplementation(async () => {
      throw new Error("refresh del");
    });
    await expect(tokenStore.revokeRefreshToken(userId, token)).rejects.toThrow(
      "refresh del",
    );
    expect(loggerMock.error.calls.length).toBe(1);
  });

  it("revokes all tokens for a user when keys are present", async () => {
    const accessKey = `token:access:${userId}:${tokenHash}`;
    const refreshKey = `token:refresh:${userId}:${tokenHash}`;
    redisMock.keys.mockImplementation(async (pattern) => {
      return pattern.includes("access") ? [accessKey] : [refreshKey];
    });
    redisMock.del.mockImplementation(async () => 1);

    await tokenStore.revokeAllUserTokens(userId);

    expect(redisMock.keys.calls[0]).toEqual([`token:access:${userId}:*`]);
    expect(redisMock.del.calls[0]).toContain(accessKey);
    expect(redisMock.del.calls[0]).toContain(refreshKey);
  });

  it("no-ops when no tokens found to revoke", async () => {
    redisMock.keys.mockResolvedValue([]);
    await tokenStore.revokeAllUserTokens(userId);
    expect(redisMock.del.calls.length).toBe(0);
  });

  it("rethrows and logs when revokeAllUserTokens fails", async () => {
    redisMock.keys.mockImplementation(async () => {
      throw new Error("keys failed");
    });
    await expect(tokenStore.revokeAllUserTokens(userId)).rejects.toThrow(
      "keys failed",
    );
    expect(loggerMock.error.calls.length).toBe(1);
  });
});
