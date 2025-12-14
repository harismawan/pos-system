import "../../testSetup.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createMockFn } from "../../mocks/mockFn.js";

const serviceMock = {
  login: createMockFn(async () => ({ accessToken: "a", refreshToken: "r" })),
  refresh: createMockFn(async () => ({
    accessToken: "na",
    refreshToken: "nr",
  })),
  requestPasswordReset: createMockFn(async () => ({
    message: "Reset email sent",
  })),
  resetPassword: createMockFn(async () => ({
    message: "Password reset successfully",
  })),
  changePassword: createMockFn(async () => ({
    message: "Password changed successfully",
  })),
};
const tokenStoreMock = {
  revokeAccessToken: createMockFn(async () => {}),
  revokeRefreshToken: createMockFn(async () => {}),
  revokeSession: createMockFn(async () => {}),
  storeSession: createMockFn(async () => {}),
};
const loggerMock = { error: createMockFn(), info: createMockFn() };
const jobsMock = {
  enqueueAuditLogJob: createMockFn(),
  createAuditLogData: (s, p) => p,
};

mock.module("../../../src/modules/auth/auth.service.js", () => serviceMock);
mock.module("../../../src/libs/tokenStore.js", () => tokenStoreMock);
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/jobs.js", () => jobsMock);

const controller = await import("../../../src/modules/auth/auth.controller.js");

describe("modules/auth/auth.controller", () => {
  beforeEach(() => {
    serviceMock.login.mockReset();
    serviceMock.login.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      user: { id: "u1", businessId: "b1", username: "u" },
    });
    serviceMock.refresh.mockReset();
    serviceMock.refresh.mockResolvedValue({
      accessToken: "na",
      refreshToken: "nr",
    });
    tokenStoreMock.revokeAccessToken.mockReset();
    tokenStoreMock.revokeRefreshToken.mockReset();
    loggerMock.error.mockReset();

    jobsMock.enqueueAuditLogJob.mockReset();
  });

  it("returns success on login", async () => {
    const set = {};
    const res = await controller.loginController({
      body: { username: "u", password: "p" },
      set,
    });

    expect(res.success).toBe(true);
    expect(res.data.accessToken).toBe("a");
  });

  it("returns 401 on invalid credentials", async () => {
    const set = {};
    serviceMock.login.mockImplementation(async () => {
      throw new Error("Invalid credentials");
    });

    const res = await controller.loginController({
      body: { username: "u", password: "p" },
      set,
    });

    expect(set.status).toBe(401);
    expect(res.success).toBe(false);
  });

  it("returns 401 on inactive account", async () => {
    const set = {};
    serviceMock.login.mockImplementation(async () => {
      throw new Error("Account is inactive");
    });

    const res = await controller.loginController({
      body: { username: "u", password: "p" },
      set,
    });

    expect(set.status).toBe(401);
    expect(res.error).toBe("Account is inactive");
  });

  it("returns 500 on unexpected login error", async () => {
    const set = {};
    serviceMock.login.mockImplementation(async () => {
      throw new Error("boom");
    });

    const res = await controller.loginController({
      body: { username: "u", password: "p" },
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("requires refresh token for refresh flow", async () => {
    const set = {};
    const res = await controller.refreshController({ body: {}, set });
    expect(set.status).toBe(400);
    expect(res.code).toBeDefined();
  });

  it("returns 401 on invalid refresh token and expired token", async () => {
    const set = {};
    serviceMock.refresh.mockImplementation(async () => {
      throw new Error("Invalid refresh token");
    });

    const res = await controller.refreshController({
      body: { refreshToken: "bad" },
      set,
    });
    expect(set.status).toBe(401);
    expect(res.code).toBeDefined();

    const err = new Error("expired");
    err.name = "TokenExpiredError";
    serviceMock.refresh.mockImplementation(async () => {
      throw err;
    });
    const res2 = await controller.refreshController({
      body: { refreshToken: "bad" },
      set,
    });
    expect(set.status).toBe(401);
    expect(res2.code).toBeDefined();
  });

  it("returns 500 on refresh unexpected error", async () => {
    const set = {};
    serviceMock.refresh.mockImplementation(async () => {
      throw new Error("boom");
    });

    const res = await controller.refreshController({
      body: { refreshToken: "token" },
      set,
    });
    expect(set.status).toBe(500);
    expect(res.error).toBe("Internal Server Error");
  });

  it("returns 401 when store.user missing in getMe", async () => {
    const set = {};
    const res = await controller.getMeController({ store: {}, set });
    expect(set.status).toBe(401);
    expect(res.success).toBe(false);
  });

  it("returns current user in getMe", async () => {
    const set = {};
    const store = { user: { id: "u1" } };

    const res = await controller.getMeController({ store, set });

    expect(res.success).toBe(true);
    expect(res.data.user.id).toBe("u1");
  });

  it("handles errors in getMe and sets 500", async () => {
    const set = {};
    // Passing null store triggers exception in controller leading to catch block
    const res = await controller.getMeController({ store: null, set });
    expect(set.status).toBe(500);
    expect(res.success).toBe(false);
  });

  it("revokes tokens during logout and still succeeds on errors", async () => {
    const res = await controller.logoutController({
      headers: { authorization: "Bearer access" },
      body: { refreshToken: "refresh" },
      store: { user: { id: "u1" } },
    });

    expect(tokenStoreMock.revokeAccessToken.calls.length).toBeGreaterThan(0);
    expect(tokenStoreMock.revokeRefreshToken.calls.length).toBeGreaterThan(0);
    expect(res.success).toBe(true);

    tokenStoreMock.revokeAccessToken.mockImplementation(async () => {
      throw new Error("fail");
    });
    const res2 = await controller.logoutController({
      headers: {},
      body: {},
      store: { user: { id: "u1" } },
    });
    expect(res2.success).toBe(true);
  });

  it("handles logout errors with missing user info gracefully", async () => {
    tokenStoreMock.revokeRefreshToken.mockImplementation(async () => {
      throw new Error("fail");
    });
    const res = await controller.logoutController({
      headers: { authorization: "Bearer access" },
      body: { refreshToken: "refresh" },
      store: {},
    });
    expect(res.success).toBe(true);
    expect(loggerMock.error.calls.length).toBeGreaterThan(0);
  });

  describe("forgotPasswordController", () => {
    beforeEach(() => {
      serviceMock.requestPasswordReset.mockReset();
      serviceMock.requestPasswordReset.mockResolvedValue({
        message: "Reset email sent",
      });
    });

    it("returns success on forgot password request", async () => {
      const set = {};
      const res = await controller.forgotPasswordController({
        body: { email: "test@example.com" },
        set,
      });

      expect(res.success).toBe(true);
      expect(serviceMock.requestPasswordReset.calls[0][0]).toBe(
        "test@example.com",
      );
    });

    it("returns error with custom status code", async () => {
      const set = {};
      const err = new Error("User not found");
      err.statusCode = 404;
      serviceMock.requestPasswordReset.mockImplementation(async () => {
        throw err;
      });

      const res = await controller.forgotPasswordController({
        body: { email: "notfound@example.com" },
        set,
      });

      expect(set.status).toBe(404);
      expect(res.error).toBe("User not found");
    });

    it("returns 500 on unexpected error", async () => {
      const set = {};
      serviceMock.requestPasswordReset.mockImplementation(async () => {
        throw new Error("Database error");
      });

      const res = await controller.forgotPasswordController({
        body: { email: "test@example.com" },
        set,
      });

      expect(set.status).toBe(500);
      expect(res.error).toBe("Internal Server Error");
    });
  });

  describe("resetPasswordController", () => {
    beforeEach(() => {
      serviceMock.resetPassword.mockReset();
      serviceMock.resetPassword.mockResolvedValue({
        message: "Password reset successfully",
      });
    });

    it("returns success on password reset", async () => {
      const set = {};
      const res = await controller.resetPasswordController({
        body: { token: "valid-token", newPassword: "newpass123" },
        set,
      });

      expect(res.success).toBe(true);
      expect(serviceMock.resetPassword.calls[0][0]).toBe("valid-token");
      expect(serviceMock.resetPassword.calls[0][1]).toBe("newpass123");
    });

    it("returns error with custom status code for invalid token", async () => {
      const set = {};
      const err = new Error("Invalid or expired token");
      err.statusCode = 400;
      serviceMock.resetPassword.mockImplementation(async () => {
        throw err;
      });

      const res = await controller.resetPasswordController({
        body: { token: "invalid-token", newPassword: "newpass123" },
        set,
      });

      expect(set.status).toBe(400);
      expect(res.error).toBe("Invalid or expired token");
    });

    it("returns 500 on unexpected error", async () => {
      const set = {};
      serviceMock.resetPassword.mockImplementation(async () => {
        throw new Error("Database error");
      });

      const res = await controller.resetPasswordController({
        body: { token: "valid-token", newPassword: "newpass123" },
        set,
      });

      expect(set.status).toBe(500);
      expect(res.error).toBe("Internal Server Error");
    });
  });

  describe("changePasswordController", () => {
    beforeEach(() => {
      serviceMock.changePassword.mockReset();
      serviceMock.changePassword.mockResolvedValue({
        message: "Password changed successfully",
      });
    });

    it("returns success on password change", async () => {
      const set = {};
      const store = { user: { id: "user-123" } };
      const res = await controller.changePasswordController({
        body: { currentPassword: "oldpass", newPassword: "newpass123" },
        store,
        set,
      });

      expect(res.success).toBe(true);
      expect(serviceMock.changePassword.calls[0][0]).toBe("user-123");
      expect(serviceMock.changePassword.calls[0][1]).toBe("oldpass");
      expect(serviceMock.changePassword.calls[0][2]).toBe("newpass123");
    });

    it("returns error with custom status code for wrong current password", async () => {
      const set = {};
      const store = { user: { id: "user-123" } };
      const err = new Error("Current password is incorrect");
      err.statusCode = 400;
      serviceMock.changePassword.mockImplementation(async () => {
        throw err;
      });

      const res = await controller.changePasswordController({
        body: { currentPassword: "wrongpass", newPassword: "newpass123" },
        store,
        set,
      });

      expect(set.status).toBe(400);
      expect(res.error).toBe("Current password is incorrect");
    });

    it("returns 500 on unexpected error", async () => {
      const set = {};
      const store = { user: { id: "user-123" } };
      serviceMock.changePassword.mockImplementation(async () => {
        throw new Error("Database error");
      });

      const res = await controller.changePasswordController({
        body: { currentPassword: "oldpass", newPassword: "newpass123" },
        store,
        set,
      });

      expect(set.status).toBe(500);
      expect(res.error).toBe("Internal Server Error");
    });
  });
});
