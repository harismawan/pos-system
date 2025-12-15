import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { resolve } from "path";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const loggerMock = { info: createMockFn(), error: createMockFn() };
const tokenStoreMock = {
  revokeAllUserTokens: createMockFn(),
  getActiveSessions: createMockFn(),
  revokeSession: createMockFn(),
  storeAccessToken: createMockFn(),
  storeRefreshToken: createMockFn(),
};
const authMock = {
  generateAccessToken: createMockFn(() => "access-token"),
  generateRefreshToken: createMockFn(() => "refresh-token"),
  authMiddleware: createMockFn((req, next) => next()), // Fix cross-contamination
};

// Mock dependencies
mock.module(resolve(import.meta.dir, "../../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("../../../src/libs/tokenStore.js", () => tokenStoreMock);
mock.module("../../../src/libs/auth.js", () => authMock);
mock.module("bcryptjs", () => ({
  default: {
    hash: createMockFn(async () => "hashed_password"),
    compare: createMockFn(async () => true),
  },
}));

const service =
  await import("../../../src/modules/superAdmin/superAdmin.service.js?real");

const superAdminId = "admin1";

describe("modules/superAdmin/superAdmin.service", () => {
  beforeEach(() => {
    prismaMock.business.findMany.mockReset?.();
    prismaMock.business.count.mockReset?.();
    prismaMock.business.findUnique.mockReset?.();
    prismaMock.business.update.mockReset?.();
    prismaMock.user.findMany.mockReset?.();
    prismaMock.user.count.mockReset?.();
    prismaMock.user.findUnique.mockReset?.();
    prismaMock.user.update.mockReset?.();
    prismaMock.outlet.count.mockReset?.();
    prismaMock.product.count.mockReset?.();
    Object.values(tokenStoreMock).forEach((fn) => fn.mockReset());
    authMock.generateAccessToken.mockReset?.(); // Wait, createMockFn default implementation?
    // Resetting mocks on specific imports might clear implementation if not careful.
    // Re-applying default implementation if needed.
    authMock.generateAccessToken.mockImplementation(() => "access-token");
  });

  describe("getBusinesses", () => {
    it("fetches businesses with pagination", async () => {
      prismaMock.business.findMany.mockResolvedValue([{ id: "b1" }]);
      prismaMock.business.count.mockResolvedValue(1);

      const result = await service.getBusinesses({ page: 1, limit: 10 });
      expect(result.businesses.length).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it("filters by search and status", async () => {
      prismaMock.business.findMany.mockResolvedValue([]);
      prismaMock.business.count.mockResolvedValue(0);

      await service.getBusinesses({
        search: "test",
        status: "ACTIVE",
      });

      const where = prismaMock.business.findMany.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.status).toBe("ACTIVE");
    });
  });

  describe("getBusinessById", () => {
    it("throws if not found", async () => {
      prismaMock.business.findUnique.mockResolvedValue(null);
      await expect(service.getBusinessById("b1")).rejects.toThrow(
        "Business not found",
      );
    });

    it("returns business details", async () => {
      prismaMock.business.findUnique.mockResolvedValue({ id: "b1" });
      const result = await service.getBusinessById("b1");
      expect(result.id).toBe("b1");
    });
  });

  describe("updateBusinessStatus", () => {
    it("updates status to SUSPENDED", async () => {
      prismaMock.business.findUnique.mockResolvedValue({ id: "b1" });
      prismaMock.business.update.mockResolvedValue({ status: "SUSPENDED" });

      await service.updateBusinessStatus("b1", "SUSPENDED", superAdminId);
      expect(prismaMock.business.update.calls[0][0].data.status).toBe(
        "SUSPENDED",
      );
      expect(prismaMock.business.update.calls[0][0].data.suspendedBy).toBe(
        superAdminId,
      );
    });

    it("updates status to ACTIVE", async () => {
      prismaMock.business.findUnique.mockResolvedValue({ id: "b1" });
      prismaMock.business.update.mockResolvedValue({ status: "ACTIVE" });

      await service.updateBusinessStatus("b1", "ACTIVE", superAdminId);
      expect(prismaMock.business.update.calls[0][0].data.status).toBe("ACTIVE");
      expect(
        prismaMock.business.update.calls[0][0].data.suspendedAt,
      ).toBeNull();
    });

    it("throws if business not found", async () => {
      prismaMock.business.findUnique.mockResolvedValue(null);
      await expect(
        service.updateBusinessStatus("b1", "active", "admin"),
      ).rejects.toThrow("Business not found");
    });
  });

  describe("getAllUsers", () => {
    it("fetches users with filters", async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: "u1" }]);
      prismaMock.user.count.mockResolvedValue(1);

      const result = await service.getAllUsers({ role: "ADMIN" });
      expect(prismaMock.user.findMany.calls[0][0].where.role).toBe("ADMIN");
      expect(result.users.length).toBe(1);
    });

    it("filters by search, isActive, and businessId", async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await service.getAllUsers({
        search: "query",
        isActive: "true",
        businessId: "biz1",
      });

      const where = prismaMock.user.findMany.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.isActive).toBe(true);
      expect(where.businessId).toBe("biz1");
    });
  });

  describe("getUserById", () => {
    it("throws if not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserById("u1")).rejects.toThrow("User not found");
    });
  });

  describe("forcePasswordReset", () => {
    it("updates password and revokes tokens", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
      prismaMock.user.update.mockResolvedValue({});
      tokenStoreMock.revokeAllUserTokens.mockResolvedValue();

      await service.forcePasswordReset("u1", "newpass");
      expect(prismaMock.user.update.calls.length).toBe(1);
      expect(tokenStoreMock.revokeAllUserTokens.calls[0][0]).toBe("u1");
    });

    it("throws if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.forcePasswordReset("u1", "pass")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("updateUserStatus", () => {
    it("throws if deactivating SUPER_ADMIN", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u1",
        role: "SUPER_ADMIN",
      });
      await expect(service.updateUserStatus("u1", false)).rejects.toThrow(
        "Cannot deactivate a Super Admin",
      );
    });

    it("revokes tokens if deactivated", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1", role: "USER" });
      prismaMock.user.update.mockResolvedValue({});
      await service.updateUserStatus("u1", false);
      expect(tokenStoreMock.revokeAllUserTokens.calls.length).toBe(1);
    });

    it("throws if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.updateUserStatus("u1", true)).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("getUserSessions", () => {
    it("fetches sessions from tokenStore", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
      tokenStoreMock.getActiveSessions.mockResolvedValue(["s1"]);
      const result = await service.getUserSessions("u1");
      expect(result).toEqual(["s1"]);
    });

    it("throws if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserSessions("u1")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("revokeAllSessions", () => {
    it("calls tokenStore revoke", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
      await service.revokeAllSessions("u1");
      expect(tokenStoreMock.revokeAllUserTokens.calls.length).toBe(1);
    });

    it("throws if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.revokeAllSessions("u1")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("revokeUserSession", () => {
    it("calls tokenStore revoke session", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
      await service.revokeUserSession("u1", "s1");
      expect(tokenStoreMock.revokeSession.calls[0][1]).toBe("s1");
    });

    it("throws if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.revokeUserSession("u1", "s1")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("impersonateUser", () => {
    it("throws if target is SUPER_ADMIN", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "target",
        role: "SUPER_ADMIN",
      });
      await expect(service.impersonateUser("target", "admin")).rejects.toThrow(
        "Cannot impersonate another Super Admin",
      );
    });

    it("throws if target inactive", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "target",
        isActive: false,
      });
      await expect(service.impersonateUser("target", "admin")).rejects.toThrow(
        "Cannot impersonate inactive user",
      );
    });

    it("generates tokens and stores them", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "target",
        isActive: true,
        role: "USER",
        outletUsers: [],
      });
      const result = await service.impersonateUser("target", "admin");
      expect(result.accessToken).toBe("access-token");
      expect(tokenStoreMock.storeAccessToken.calls.length).toBe(1);
    });

    it("throws if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.impersonateUser("t1", "a1")).rejects.toThrow(
        "User not found",
      );
    });

    it("maps outlet users correctly", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "target",
        isActive: true,
        role: "USER",
        outletUsers: [
          {
            outletId: "o1",
            outletRole: "STAFF",
            isDefaultForUser: true,
            outlet: { id: "o1", name: "Outlet 1", code: "O1" },
          },
        ],
      });
      const result = await service.impersonateUser("target", "admin");
      expect(result.outlets.length).toBe(1);
      expect(result.outlets[0].id).toBe("o1");
      expect(result.outlets[0].role).toBe("STAFF");
    });
  });

  describe("getDashboardStats", () => {
    it("aggregates stats", async () => {
      prismaMock.business.count.mockResolvedValue(10);
      prismaMock.user.count.mockResolvedValue(50);
      prismaMock.outlet.count.mockResolvedValue(5);
      prismaMock.product.count.mockResolvedValue(100);
      prismaMock.business.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats();
      expect(result.businesses.total).toBe(10);
      expect(result.users.total).toBe(50);
    });
  });
});
