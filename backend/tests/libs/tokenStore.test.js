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
    redisMock.get.mockReset?.();
    redisMock.del.mockReset?.();
    redisMock.keys.mockReset?.();
    redisMock.hset.mockReset?.();
    redisMock.expire.mockReset?.();
    redisMock.hgetall.mockReset?.();
    redisMock.ttl.mockReset?.();
    loggerMock.error.mockReset?.();
    redisMock.ttl.mockReset?.();
    redisMock.recordCacheHit.mockReset?.();
    redisMock.recordCacheMiss.mockReset?.();
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
    const userData = { id: "user-1" };
    redisMock.get.mockImplementation(async () => JSON.stringify(userData));
    const result = await tokenStore.validateAccessToken(userId, token);
    expect(result.valid).toBe(true);
    expect(result.userData).toEqual(userData);
    expect(redisMock.get.calls[0]).toEqual([
      `token:access:${userId}:${tokenHash}`,
    ]);
  });

  it("returns cached user data when available", async () => {
    const userData = { id: "user-1", name: "Test" };
    redisMock.get.mockImplementation(async () => JSON.stringify(userData));
    const result = await tokenStore.validateAccessToken(userId, token);
    expect(result.valid).toBe(true);
    expect(result.userData).toEqual(userData);
  });

  it("returns invalid and records cache miss when access token missing", async () => {
    redisMock.get.mockResolvedValue(null);
    const result = await tokenStore.validateAccessToken(userId, token);
    expect(result.valid).toBe(false);
    expect(result.userData).toBeNull();
    expect(redisMock.recordCacheMiss.calls.length).toBe(1);
    expect(redisMock.recordCacheMiss.calls[0][0]).toBe("user_cache");
  });

  it("returns false when access token validation errors", async () => {
    redisMock.get.mockImplementation(async () => {
      throw new Error("boom");
    });
    const result = await tokenStore.validateAccessToken(userId, token);
    expect(result.valid).toBe(false);
    expect(result.userData).toBe(null);
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

  describe("session management", () => {
    const sessionId = "session-123";

    it("stores session with metadata and ttl", async () => {
      const metadata = { userAgent: "Mozilla", ipAddress: "127.0.0.1" };
      await tokenStore.storeSession(userId, sessionId, metadata, 3600);

      expect(redisMock.hset.calls[0][0]).toBe(`session:${userId}:${sessionId}`);
      expect(redisMock.hset.calls[0][1]).toEqual(
        expect.objectContaining({
          userAgent: "Mozilla",
          ipAddress: "127.0.0.1",
          createdAt: expect.any(String),
          lastActiveAt: expect.any(String),
        }),
      );
      expect(redisMock.expire.calls[0]).toEqual([
        `session:${userId}:${sessionId}`,
        3600,
      ]);
    });

    it("logs and rethrows when storing session fails", async () => {
      redisMock.hset.mockRejectedValue(new Error("redis fail"));
      await expect(
        tokenStore.storeSession(userId, sessionId, {}, 1),
      ).rejects.toThrow("redis fail");
      expect(loggerMock.error.calls.length).toBe(1);
    });

    it("gets active sessions", async () => {
      const sessionKey = `session:${userId}:${sessionId}`;
      redisMock.keys.mockResolvedValue([sessionKey]);
      redisMock.hgetall.mockResolvedValue({
        userAgent: "Agent",
        createdAt: "2024-01-01",
      });
      redisMock.ttl.mockResolvedValue(100);

      const sessions = await tokenStore.getActiveSessions(userId);

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual({
        sessionId,
        userAgent: "Agent",
        createdAt: "2024-01-01",
        expiresIn: 100,
      });
    });

    it("returns empty array if no sessions found", async () => {
      redisMock.keys.mockResolvedValue([]);
      const sessions = await tokenStore.getActiveSessions(userId);
      expect(sessions).toHaveLength(0);
    });

    it("returns empty array and logs error when getting sessions fails", async () => {
      redisMock.keys.mockRejectedValue(new Error("keys fail"));
      const sessions = await tokenStore.getActiveSessions(userId);
      expect(sessions).toHaveLength(0);
      expect(loggerMock.error.calls.length).toBe(1);
    });

    it("revokes session and related tokens", async () => {
      await tokenStore.revokeSession(userId, sessionId);
      expect(redisMock.del.calls[0]).toContain(
        `session:${userId}:${sessionId}`,
      );
      expect(redisMock.del.calls[0]).toContain(
        `token:access:${userId}:${sessionId}`,
      );
      expect(redisMock.del.calls[0]).toContain(
        `token:refresh:${userId}:${sessionId}`,
      );
    });

    it("logs and throws when revoking session fails", async () => {
      redisMock.del.mockRejectedValue(new Error("del fail"));
      await expect(tokenStore.revokeSession(userId, sessionId)).rejects.toThrow(
        "del fail",
      );
      expect(loggerMock.error.calls.length).toBe(1);
    });

    it("updates session activity if session exists", async () => {
      redisMock.exists.mockResolvedValue(true);
      await tokenStore.updateSessionActivity(userId, sessionId);
      expect(redisMock.hset.calls[0][0]).toBe(`session:${userId}:${sessionId}`);
      expect(redisMock.hset.calls[0][1]).toBe("lastActiveAt");
      expect(redisMock.hset.calls[0][2]).toEqual(expect.any(String));
    });

    it("does not update activity if session missing", async () => {
      redisMock.exists.mockResolvedValue(false);
      await tokenStore.updateSessionActivity(userId, sessionId);
      expect(redisMock.hset.calls.length).toBe(0);
    });

    it("logs debug error and does not throw when update activity fails", async () => {
      redisMock.exists.mockRejectedValue(new Error("exists fail"));
      await tokenStore.updateSessionActivity(userId, sessionId);
      expect(loggerMock.debug.calls.length).toBe(1);
    });
  });
});
