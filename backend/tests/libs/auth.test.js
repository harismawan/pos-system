import "../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import jwt from "jsonwebtoken";
import { resolve } from "path";
import { createPrismaMock } from "../mocks/prisma.js";
import { createLoggerMock } from "../mocks/logger.js";
import { createMockFn } from "../mocks/mockFn.js";
import { AUT } from "../../src/libs/responseCodes.js";

const prismaMock = createPrismaMock();
const tokenStoreMock = {
  validateAccessToken: createMockFn(),
};
const loggerMock = createLoggerMock();

// Use absolute path to ensure specific mocking
mock.module(resolve(import.meta.dir, "../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));
mock.module("../../src/libs/tokenStore.js", () => ({
  validateAccessToken: tokenStoreMock.validateAccessToken,
  storeAccessToken: createMockFn(),
  storeRefreshToken: createMockFn(),
  validateRefreshToken: createMockFn(),
  revokeAccessToken: createMockFn(),
  revokeRefreshToken: createMockFn(),
  revokeAllUserTokens: createMockFn(),
  storeSession: createMockFn(),
  getActiveSessions: createMockFn(),
  revokeSession: createMockFn(),
  updateSessionActivity: createMockFn(),
}));
mock.module("../../src/libs/logger.js", () => ({ default: loggerMock }));

const authModule = await import("../../src/libs/auth.js");

describe("libs/auth token helpers", () => {
  beforeEach(() => {
    loggerMock.warn.mockReset?.();
  });

  it("generates and verifies access tokens", () => {
    const token = authModule.generateAccessToken({
      userId: "user-1",
      role: "OWNER",
    });
    const payload = authModule.verifyAccessToken(token);
    expect(payload.userId).toBe("user-1");
    expect(payload.role).toBe("OWNER");
  });

  it("verifies refresh tokens and exposes expiration errors", () => {
    const refresh = authModule.generateRefreshToken({ userId: "user-2" });
    const payload = authModule.verifyRefreshToken(refresh);
    expect(payload.userId).toBe("user-2");
  });

  it("throws on invalid access token", () => {
    const bad = `${authModule.generateAccessToken({ userId: "u" })}tamper`;
    expect(() => authModule.verifyAccessToken(bad)).toThrow(
      "Invalid or expired token",
    );
  });

  it("throws specific error when refresh token expired", () => {
    const expired = jwt.sign(
      { userId: "u1", exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.REFRESH_TOKEN_SECRET,
    );
    const err = (() => {
      try {
        authModule.verifyRefreshToken(expired);
      } catch (e) {
        return e;
      }
    })();
    expect(err.message).toBe("Refresh token expired");
    expect(err.code).toBe("REFRESH_TOKEN_EXPIRED");
  });

  it("throws on invalid refresh token", () => {
    const invalid = `${authModule.generateRefreshToken({ userId: "u1" })}bad`;
    expect(() => authModule.verifyRefreshToken(invalid)).toThrow(
      "Invalid or expired refresh token",
    );
  });
});

describe("libs/auth middleware", () => {
  beforeEach(() => {
    tokenStoreMock.validateAccessToken.mockReset();
    prismaMock.user.findUnique.mockReset?.();
    loggerMock.warn.mockReset?.();
  });

  it("rejects missing authorization header", async () => {
    const set = {};
    const result = await authModule.authMiddleware({
      headers: {},
      set,
      store: {},
    });
    expect(set.status).toBe(401);
    expect(result.code).toBe(AUT.NOT_AUTHENTICATED);
  });

  it("rejects expired access token", async () => {
    const expired = jwt.sign({ userId: "user-1" }, process.env.JWT_SECRET, {
      expiresIn: -1,
    });
    const set = {};
    const result = await authModule.authMiddleware({
      headers: { authorization: `Bearer ${expired}` },
      set,
      store: {},
    });
    expect(set.status).toBe(401);
    expect(result.code).toBe(AUT.ACCESS_TOKEN_EXPIRED);
  });

  it("rejects invalid access token format", async () => {
    const set = {};
    const result = await authModule.authMiddleware({
      headers: { authorization: "Bearer bad" },
      set,
      store: {},
    });
    expect(set.status).toBe(401);
    expect(result.error).toBe("Invalid token");
    expect(loggerMock.warn.calls.length).toBe(1);
  });

  it("rejects revoked tokens", async () => {
    const token = jwt.sign({ userId: "user-1" }, process.env.JWT_SECRET);
    tokenStoreMock.validateAccessToken.mockImplementation(async () => false);
    prismaMock.user.findUnique.mockImplementation(async () => ({
      outletUsers: [],
      isActive: true,
    }));

    const set = {};
    const result = await authModule.authMiddleware({
      headers: { authorization: `Bearer ${token}` },
      set,
      store: {},
    });

    expect(set.status).toBe(401);
    expect(result.code).toBe(AUT.ACCESS_TOKEN_EXPIRED);
  });

  it("rejects inactive user", async () => {
    const token = jwt.sign({ userId: "user-1" }, process.env.JWT_SECRET);
    tokenStoreMock.validateAccessToken.mockResolvedValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      isActive: false,
      outletUsers: [],
    });
    const set = {};
    const result = await authModule.authMiddleware({
      headers: { authorization: `Bearer ${token}` },
      set,
      store: {},
    });
    expect(set.status).toBe(401);
    expect(result.error).toBe("User not found or inactive");
  });

  it("rejects outlet without access for non-admin roles", async () => {
    const token = jwt.sign(
      { userId: "user-1", role: "CASHIER" },
      process.env.JWT_SECRET,
    );
    tokenStoreMock.validateAccessToken.mockResolvedValue(true);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      username: "joe",
      name: "Joe",
      role: "CASHIER",
      isActive: true,
      outletUsers: [
        {
          outlet: { id: "out-1", name: "Outlet", code: "O1" },
          outletId: "out-1",
          outletRole: "CASHIER",
          isDefaultForUser: false,
        },
      ],
    });
    const set = {};
    const store = {};
    const result = await authModule.authMiddleware({
      headers: { authorization: `Bearer ${token}`, "x-outlet-id": "out-2" },
      set,
      store,
    });
    expect(set.status).toBe(403);
    expect(result.code).toBe("AUT-403-001");
  });

  it("attaches user context when token is valid", async () => {
    const token = jwt.sign(
      { userId: "user-1", role: "ADMIN" },
      process.env.JWT_SECRET,
    );
    tokenStoreMock.validateAccessToken.mockImplementation(async () => true);
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      username: "jane",
      name: "Jane Doe",
      role: "ADMIN",
      isActive: true,
      outletUsers: [
        {
          outlet: { id: "out-1", name: "Outlet 1", code: "OUT1" },
          outletId: "out-1",
          outletRole: "MANAGER",
          isDefaultForUser: true,
        },
      ],
    }));

    const store = {};
    const set = {};
    const result = await authModule.authMiddleware({
      headers: { authorization: `Bearer ${token}`, "x-outlet-id": "out-1" },
      set,
      store,
    });

    expect(result).toBeUndefined();
    expect(store.user.id).toBe("user-1");
    expect(store.outletId).toBe("out-1");
    expect(set.status).toBeUndefined();
  });
});

describe("libs/auth requireRole", () => {
  it("blocks roles that are not allowed", () => {
    const guard = authModule.requireRole(["ADMIN"]);
    const set = {};
    const result = guard({ store: { user: { role: "CASHIER" } }, set });

    expect(set.status).toBe(403);
    expect(result.success).toBe(false);
  });

  it("blocks when no user", () => {
    const guard = authModule.requireRole(["ADMIN"]);
    const set = {};
    const result = guard({ store: {}, set });
    expect(set.status).toBe(401);
    expect(result.error).toBe("Authentication required");
  });

  it("allows permitted role", () => {
    const guard = authModule.requireRole(["ADMIN"]);
    const set = {};
    const result = guard({ store: { user: { role: "ADMIN" } }, set });
    expect(result).toBeUndefined();
    expect(set.status).toBeUndefined();
  });
});
