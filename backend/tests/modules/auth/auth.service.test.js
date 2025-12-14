import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createLoggerMock } from "../../mocks/logger.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const loggerMock = createLoggerMock();
const bcryptMock = {
  compare: createMockFn(async () => true),
  hash: createMockFn(async () => "hashed-password"),
};

const tokenHelpersMock = {
  generateAccessToken: createMockFn(() => "access-token"),
  generateRefreshToken: createMockFn(() => "refresh-token"),
  verifyRefreshToken: createMockFn(() => ({ userId: "user-1" })),
};

const tokenStoreMock = {
  storeAccessToken: createMockFn(async () => undefined),
  storeRefreshToken: createMockFn(async () => undefined),
  validateRefreshToken: createMockFn(async () => true),
  revokeRefreshToken: createMockFn(async () => undefined),
  storeSession: createMockFn(async () => undefined),
  revokeSession: createMockFn(async () => undefined),
};

const otpStoreMock = {
  generateResetToken: createMockFn(() => "reset-token-123"),
  storeResetToken: createMockFn(async () => undefined),
  verifyResetToken: createMockFn(async () => "user-1"),
  deleteResetToken: createMockFn(async () => undefined),
};

const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
  enqueueEmailNotificationJob: createMockFn(),
};

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("bcryptjs", () => ({ default: bcryptMock }));
mock.module("../../../src/libs/auth.js", () => tokenHelpersMock);
mock.module("../../../src/libs/tokenStore.js", () => tokenStoreMock);
mock.module("../../../src/libs/otpStore.js", () => otpStoreMock);
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const authService =
  await import("../../../src/modules/auth/auth.service.js?controller");

const resetCommonMocks = () => {
  prismaMock.user.findUnique.mockReset?.();
  prismaMock.user.update.mockReset?.();
  tokenStoreMock.storeAccessToken.mockReset?.();
  tokenStoreMock.storeRefreshToken.mockReset?.();
  tokenStoreMock.validateRefreshToken.mockReset?.();
  tokenStoreMock.revokeRefreshToken.mockReset?.();
  bcryptMock.compare.mockReset?.();
  bcryptMock.hash.mockReset?.();
  tokenHelpersMock.generateAccessToken.mockReset?.();
  tokenHelpersMock.generateRefreshToken.mockReset?.();
  tokenHelpersMock.verifyRefreshToken.mockReset?.();
  otpStoreMock.generateResetToken.mockReset?.();
  otpStoreMock.storeResetToken.mockReset?.();
  otpStoreMock.verifyResetToken.mockReset?.();
  otpStoreMock.deleteResetToken.mockReset?.();
  jobsMock.enqueueAuditLogJob.mockReset?.();
  jobsMock.enqueueEmailNotificationJob.mockReset?.();
};

describe("modules/auth/auth.service login", () => {
  beforeEach(() => {
    resetCommonMocks();
    tokenHelpersMock.generateAccessToken.mockReturnValue("access-token");
    tokenHelpersMock.generateRefreshToken.mockReturnValue("refresh-token");
    bcryptMock.compare.mockImplementation(async () => true);
  });

  it("throws when user is not found", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => null);

    const err = await authService.login("missing", "secret").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Invalid credentials");
  });

  it("throws when account is inactive", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      isActive: false,
      passwordHash: "hash",
      outletUsers: [],
    }));

    await expect(authService.login("user", "secret")).rejects.toThrow(
      "Account is inactive",
    );
  });

  it("throws when password is invalid", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      isActive: true,
      passwordHash: "hash",
      outletUsers: [],
    }));
    bcryptMock.compare.mockImplementation(async () => false);

    await expect(authService.login("user", "bad")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  it("returns tokens and stores them when credentials are valid", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      username: "user",
      name: "Test User",
      email: "user@example.com",
      role: "OWNER",
      passwordHash: "hash",
      isActive: true,
      outletUsers: [],
    }));
    bcryptMock.compare.mockImplementation(async () => true);

    const result = await authService.login("user", "secret");

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(tokenStoreMock.storeAccessToken.calls.length).toBeGreaterThan(0);
    expect(tokenStoreMock.storeRefreshToken.calls.length).toBeGreaterThan(0);
  });

  it("maps outlets and enqueues audit log with payload", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      username: "user",
      name: "Test User",
      email: "user@example.com",
      role: "OWNER",
      passwordHash: "hash",
      isActive: true,
      outletUsers: [
        {
          outlet: { id: "o1", name: "Outlet", code: "OUT" },
          outletRole: "MANAGER",
          isDefaultForUser: true,
        },
      ],
    }));

    const res = await authService.login("user", "secret");

    expect(res.outlets[0]).toEqual({
      id: "o1",
      name: "Outlet",
      code: "OUT",
      role: "MANAGER",
      isDefault: true,
    });
  });

  it("stores tokens with TTL values from config", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      username: "user",
      name: "Test User",
      email: "user@example.com",
      role: "OWNER",
      passwordHash: "hash",
      isActive: true,
      outletUsers: [],
    }));

    await authService.login("user", "secret");

    const accessArgs = tokenStoreMock.storeAccessToken.calls[0];
    const refreshArgs = tokenStoreMock.storeRefreshToken.calls[0];
    expect(accessArgs[0]).toBe("user-1");
    expect(accessArgs[2]).toBe(900); // 15m in seconds per test setup
    expect(refreshArgs[2]).toBe(86400); // 1d in seconds per test setup
  });
});

describe("modules/auth/auth.service refresh/getMe", () => {
  beforeEach(() => {
    resetCommonMocks();
    tokenHelpersMock.verifyRefreshToken.mockImplementation(() => ({
      userId: "user-1",
    }));
    tokenHelpersMock.generateAccessToken.mockReturnValue("new-access");
    tokenHelpersMock.generateRefreshToken.mockReturnValue("new-refresh");
    tokenStoreMock.validateRefreshToken.mockResolvedValue(true);
  });

  it("throws when refresh token is invalid in store", async () => {
    tokenHelpersMock.verifyRefreshToken.mockImplementation(() => ({
      userId: "user-1",
    }));
    tokenStoreMock.validateRefreshToken.mockImplementation(async () => false);
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      isActive: true,
    }));

    const err = await authService.refresh("rt").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
  });

  it("throws when refresh token user not found", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => null);
    await expect(authService.refresh("rt")).rejects.toThrow(
      "Invalid refresh token",
    );
  });

  it("throws when refresh user is inactive", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      isActive: false,
    }));

    await expect(authService.refresh("rt")).rejects.toThrow(
      "Invalid refresh token",
    );
  });

  it("returns new tokens and stores them on refresh", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      isActive: true,
      role: "ADMIN",
    }));
    tokenStoreMock.validateRefreshToken.mockResolvedValue(true);
    tokenStoreMock.revokeRefreshToken.mockResolvedValue();

    const res = await authService.refresh("rt");

    expect(res.accessToken).toBeDefined();
    expect(tokenStoreMock.storeAccessToken.calls.length).toBe(1);
    expect(tokenStoreMock.revokeRefreshToken.calls.length).toBe(1);
    expect(tokenStoreMock.storeAccessToken.calls[0][2]).toBe(900);
    expect(tokenStoreMock.storeRefreshToken.calls[0][2]).toBe(86400);
    expect(tokenStoreMock.revokeRefreshToken.calls[0]).toEqual([
      "user-1",
      "rt",
    ]);
  });

  it("throws when refresh token verification fails", async () => {
    tokenHelpersMock.verifyRefreshToken.mockImplementation(() => {
      throw new Error("invalid");
    });

    await expect(authService.refresh("bad")).rejects.toThrow("invalid");
  });

  it("returns user data in getMe", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "u1",
      username: "user",
      name: "Name",
      email: "a@b.com",
      role: "ADMIN",
      outletUsers: [
        {
          outlet: { id: "o1", name: "Outlet", code: "O1" },
          outletRole: "CLERK",
          isDefaultForUser: false,
        },
      ],
    }));

    const result = await authService.getMe("u1");
    expect(result.id).toBe("u1");
    expect(result.role).toBe("ADMIN");
    expect(result.outlets[0]).toEqual({
      id: "o1",
      name: "Outlet",
      code: "O1",
      role: "CLERK",
      isDefault: false,
    });
  });

  it("throws when user not found in getMe", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => null);

    await expect(authService.getMe("missing")).rejects.toThrow(
      "User not found",
    );
  });
});

describe("modules/auth/auth.service requestPasswordReset", () => {
  beforeEach(() => {
    resetCommonMocks();
    otpStoreMock.generateResetToken.mockReturnValue("reset-token-123");
  });

  it("throws 404 when email not found", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => null);

    const err = await authService
      .requestPasswordReset("notfound@example.com")
      .catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Email not found");
    expect(err.statusCode).toBe(404);
  });

  it("throws 400 when account is inactive", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      email: "test@example.com",
      isActive: false,
    }));

    const err = await authService
      .requestPasswordReset("test@example.com")
      .catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Account is inactive");
    expect(err.statusCode).toBe(400);
  });

  it("generates token and sends email on valid request", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      isActive: true,
    }));

    const result = await authService.requestPasswordReset("test@example.com");

    expect(result.message).toContain("Password reset link");
    expect(otpStoreMock.generateResetToken.calls.length).toBe(1);
    expect(otpStoreMock.storeResetToken.calls[0][0]).toBe("reset-token-123");
    expect(otpStoreMock.storeResetToken.calls[0][1]).toBe("user-1");
    expect(jobsMock.enqueueEmailNotificationJob.calls.length).toBe(1);
    expect(jobsMock.enqueueEmailNotificationJob.calls[0][0].toEmail).toBe(
      "test@example.com",
    );
  });

  it("converts email to lowercase", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      isActive: true,
    }));

    await authService.requestPasswordReset("TEST@EXAMPLE.COM");

    expect(prismaMock.user.findUnique.calls[0][0].where.email).toBe(
      "test@example.com",
    );
  });

  it("includes reset link with custom frontend URL", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      isActive: true,
    }));

    await authService.requestPasswordReset(
      "test@example.com",
      "https://app.example.com",
    );

    const emailJob = jobsMock.enqueueEmailNotificationJob.calls[0][0];
    expect(emailJob.templateData.resetLink).toContain(
      "https://app.example.com/reset-password",
    );
  });
});

describe("modules/auth/auth.service resetPassword", () => {
  beforeEach(() => {
    resetCommonMocks();
    otpStoreMock.verifyResetToken.mockResolvedValue("user-1");
    bcryptMock.hash.mockResolvedValue("hashed-new-password");
  });

  it("throws 400 when token is invalid", async () => {
    otpStoreMock.verifyResetToken.mockResolvedValue(null);

    const err = await authService
      .resetPassword("invalid-token", "newpass123")
      .catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Invalid or expired reset link");
    expect(err.statusCode).toBe(400);
  });

  it("throws 400 when user not found", async () => {
    otpStoreMock.verifyResetToken.mockResolvedValue("user-1");
    prismaMock.user.findUnique.mockImplementation(async () => null);

    const err = await authService
      .resetPassword("valid-token", "newpass123")
      .catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Invalid or expired reset link");
    expect(err.statusCode).toBe(400);
  });

  it("resets password successfully", async () => {
    otpStoreMock.verifyResetToken.mockResolvedValue("user-1");
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      email: "test@example.com",
    }));
    prismaMock.user.update.mockImplementation(async () => ({
      id: "user-1",
    }));

    const result = await authService.resetPassword("valid-token", "newpass123");

    expect(result.message).toContain("reset successfully");
    expect(bcryptMock.hash.calls[0][0]).toBe("newpass123");
    expect(bcryptMock.hash.calls[0][1]).toBe(10);
    expect(prismaMock.user.update.calls[0][0].where.id).toBe("user-1");
    expect(prismaMock.user.update.calls[0][0].data.passwordHash).toBe(
      "hashed-new-password",
    );
    expect(otpStoreMock.deleteResetToken.calls[0][0]).toBe("valid-token");
  });
});

describe("modules/auth/auth.service changePassword", () => {
  beforeEach(() => {
    resetCommonMocks();
    bcryptMock.compare.mockResolvedValue(true);
    bcryptMock.hash.mockResolvedValue("hashed-new-password");
  });

  it("throws 404 when user not found", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => null);

    const err = await authService
      .changePassword("user-1", "oldpass", "newpass")
      .catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("User not found");
    expect(err.statusCode).toBe(404);
  });

  it("throws 400 when current password is incorrect", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      passwordHash: "old-hash",
    }));
    bcryptMock.compare.mockResolvedValue(false);

    const err = await authService
      .changePassword("user-1", "wrongpass", "newpass")
      .catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Current password is incorrect");
    expect(err.statusCode).toBe(400);
  });

  it("changes password successfully", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "user-1",
      passwordHash: "old-hash",
    }));
    bcryptMock.compare.mockResolvedValue(true);
    prismaMock.user.update.mockImplementation(async () => ({
      id: "user-1",
    }));

    const result = await authService.changePassword(
      "user-1",
      "oldpass",
      "newpass123",
    );

    expect(result.message).toContain("changed successfully");
    expect(bcryptMock.compare.calls[0]).toEqual(["oldpass", "old-hash"]);
    expect(bcryptMock.hash.calls[0][0]).toBe("newpass123");
    expect(bcryptMock.hash.calls[0][1]).toBe(10);
    expect(prismaMock.user.update.calls[0][0].where.id).toBe("user-1");
    expect(prismaMock.user.update.calls[0][0].data.passwordHash).toBe(
      "hashed-new-password",
    );
  });
});
