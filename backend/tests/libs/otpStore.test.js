import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createRedisMock } from "../mocks/redis.js";

const redisMock = createRedisMock();

// Mock redis before importing otpStore module
mock.module("../../src/libs/redis.js", () => ({ default: redisMock }));

// Import otpStore module
const {
  generateResetToken,
  storeResetToken,
  verifyResetToken,
  deleteResetToken,
  TOKEN_TTL,
} = await import("../../src/libs/otpStore.js");

describe("libs/otpStore", () => {
  beforeEach(() => {
    redisMock.setex.mockReset?.();
    redisMock.get.mockReset?.();
    redisMock.del.mockReset?.();
  });

  describe("TOKEN_TTL", () => {
    it("has correct TTL value of 1 hour", () => {
      expect(TOKEN_TTL).toBe(3600); // 60 * 60
    });
  });

  describe("generateResetToken", () => {
    it("generates a 64-character hex token", () => {
      const token = generateResetToken();
      expect(token).toBeTypeOf("string");
      expect(token.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
    });

    it("generates unique tokens on each call", () => {
      const token1 = generateResetToken();
      const token2 = generateResetToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("storeResetToken", () => {
    it("stores token in Redis with default TTL", async () => {
      const token = "test-token-123";
      const userId = "user-456";

      await storeResetToken(token, userId);

      expect(redisMock.setex.calls[0][0]).toBe("reset:token:test-token-123");
      expect(redisMock.setex.calls[0][1]).toBe(3600); // Default TOKEN_TTL
      expect(redisMock.setex.calls[0][2]).toBe(userId);
    });

    it("stores token in Redis with custom TTL", async () => {
      const token = "test-token-456";
      const userId = "user-789";
      const customTTL = 1800; // 30 minutes

      await storeResetToken(token, userId, customTTL);

      expect(redisMock.setex.calls[0][0]).toBe("reset:token:test-token-456");
      expect(redisMock.setex.calls[0][1]).toBe(customTTL);
      expect(redisMock.setex.calls[0][2]).toBe(userId);
    });

    it("throws error when Redis fails", async () => {
      redisMock.setex.mockRejectedValue(new Error("Redis connection failed"));

      await expect(storeResetToken("token", "user-id")).rejects.toThrow(
        "Redis connection failed",
      );
    });
  });

  describe("verifyResetToken", () => {
    it("returns user ID when token is valid", async () => {
      const token = "valid-token";
      const userId = "user-123";
      redisMock.get.mockResolvedValue(userId);

      const result = await verifyResetToken(token);

      expect(result).toBe(userId);
      expect(redisMock.get.calls[0][0]).toBe("reset:token:valid-token");
    });

    it("returns null when token is not found", async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await verifyResetToken("invalid-token");

      expect(result).toBeNull();
    });

    it("returns null when token is expired", async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await verifyResetToken("expired-token");

      expect(result).toBeNull();
    });

    it("throws error when Redis fails", async () => {
      redisMock.get.mockRejectedValue(new Error("Redis error"));

      await expect(verifyResetToken("token")).rejects.toThrow("Redis error");
    });
  });

  describe("deleteResetToken", () => {
    it("deletes token from Redis", async () => {
      const token = "token-to-delete";

      await deleteResetToken(token);

      expect(redisMock.del.calls[0][0]).toBe("reset:token:token-to-delete");
    });

    it("throws error when Redis fails", async () => {
      redisMock.del.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteResetToken("token")).rejects.toThrow("Delete failed");
    });
  });

  describe("integration workflow", () => {
    it("completes full reset token workflow", async () => {
      // Generate token
      const token = generateResetToken();
      expect(token.length).toBe(64);

      // Store token
      redisMock.setex.mockResolvedValue("OK");
      await storeResetToken(token, "user-workflow-123");
      expect(redisMock.setex.calls[0][0]).toBe(`reset:token:${token}`);

      // Verify token
      redisMock.get.mockResolvedValue("user-workflow-123");
      const userId = await verifyResetToken(token);
      expect(userId).toBe("user-workflow-123");

      // Delete token after use
      redisMock.del.mockResolvedValue(1);
      await deleteResetToken(token);
      expect(redisMock.del.calls[0][0]).toBe(`reset:token:${token}`);
    });
  });
});
