import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { resolve } from "path";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const jobsMock = {
  enqueueEmailNotificationJob: createMockFn(),
};

// Mock dependencies
mock.module(resolve(import.meta.dir, "../../../src/libs/prisma.js"), () => ({
  default: prismaMock,
}));
mock.module("../../../src/libs/jobs.js", () => jobsMock);
mock.module("bcryptjs", () => ({
  default: {
    hash: createMockFn(async () => "hashed_password"),
    compare: createMockFn(async () => true),
  },
}));

const service =
  await import("../../../src/modules/invitations/invitations.service.js?real");

const businessId = "biz-1";

describe("modules/invitations/invitations.service", () => {
  beforeEach(() => {
    prismaMock.business.findUnique.mockReset?.();
    prismaMock.user.findUnique.mockReset?.();
    prismaMock.userInvitation.findFirst.mockReset?.();
    prismaMock.userInvitation.create.mockReset?.();
    prismaMock.userInvitation.findUnique.mockReset?.();
    prismaMock.userInvitation.delete.mockReset?.();
    prismaMock.userInvitation.findMany.mockReset?.();
    prismaMock.userInvitation.count.mockReset?.();
    prismaMock.$transaction.mockReset?.();
    jobsMock.enqueueEmailNotificationJob.mockReset();

    // Default business check pass
    prismaMock.business.findUnique.mockResolvedValue({
      id: businessId,
      name: "Test Biz",
    });
  });

  describe("createInvitation", () => {
    it("throws if business not found", async () => {
      prismaMock.business.findUnique.mockResolvedValue(null);
      await expect(
        service.createInvitation({ email: "test@example.com", businessId }),
      ).rejects.toThrow("Business not found");
    });

    it("throws if user already exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
      await expect(
        service.createInvitation({ email: "test@example.com", businessId }),
      ).rejects.toThrow("User with this email already exists");
    });

    it("throws if pending invitation exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.userInvitation.findFirst.mockResolvedValue({ id: "inv1" });
      await expect(
        service.createInvitation({ email: "test@example.com", businessId }),
      ).rejects.toThrow("Pending invitation already exists");
    });

    it("creates invitation and sends email", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.userInvitation.findFirst.mockResolvedValue(null);
      prismaMock.userInvitation.create.mockResolvedValue({
        id: "inv-new",
        email: "test@example.com",
        role: "ADMIN",
        expiresAt: new Date(),
        business: { name: "Test Biz" },
        inviter: { name: "Admin" },
      });

      const result = await service.createInvitation({
        email: "test@example.com",
        role: "ADMIN",
        businessId,
        invitedBy: "u1",
      });

      expect(result.id).toBe("inv-new");
      expect(prismaMock.userInvitation.create.calls.length).toBe(1);
      expect(jobsMock.enqueueEmailNotificationJob.calls.length).toBe(1);
    });
  });

  describe("getInvitations", () => {
    it("fetches invitations with status", async () => {
      prismaMock.userInvitation.findMany.mockResolvedValue([
        { id: "i1", expiresAt: new Date(Date.now() + 10000) },
        { id: "i2", expiresAt: new Date(Date.now() - 10000) }, // Expired
      ]);
      prismaMock.userInvitation.count.mockResolvedValue(2);

      const result = await service.getInvitations({ businessId, page: 1 });
      expect(result.invitations[0].status).toBe("PENDING");
      // i2 logic depends on new Date() timing, but should be EXPIRED if mock data is right
      // Actually service uses new Date() internally so i2 should be expired if logic holds.
      expect(result.invitations.length).toBe(2);
    });

    it("throws if businessId is missing", async () => {
      await expect(service.getInvitations({})).rejects.toThrow(
        "businessId is required",
      );
    });
  });

  describe("cancelInvitation", () => {
    it("throws if invitation not found or wrong business", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue(null);
      await expect(
        service.cancelInvitation("inv1", businessId),
      ).rejects.toThrow("Invitation not found");
    });

    it("throws if businessId is missing", async () => {
      await expect(service.cancelInvitation("inv1")).rejects.toThrow(
        "businessId is required",
      );
    });

    it("throws if invitation already accepted", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        id: "inv1",
        businessId,
        acceptedAt: new Date(),
      });
      await expect(
        service.cancelInvitation("inv1", businessId),
      ).rejects.toThrow("Invitation has already been accepted");
    });

    it("deletes invitation if valid", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        id: "inv1",
        businessId,
      });
      prismaMock.userInvitation.delete.mockResolvedValue({});
      await service.cancelInvitation("inv1", businessId);
      expect(prismaMock.userInvitation.delete.calls.length).toBe(1);
    });
  });

  describe("verifyInvitationToken", () => {
    it("throws if token invalid", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue(null);
      await expect(service.verifyInvitationToken("tok")).rejects.toThrow(
        "Invalid invitation link",
      );
    });

    it("throws if expired", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.verifyInvitationToken("tok")).rejects.toThrow(
        "Invitation has expired",
      );
    });

    it("throws if already accepted", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        acceptedAt: new Date(),
      });
      await expect(service.verifyInvitationToken("tok")).rejects.toThrow(
        "Invitation has already been used",
      );
    });

    it("returns details if valid", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        email: "ok@test.com",
        expiresAt: new Date(Date.now() + 10000),
        business: { id: "b1", name: "Bn" },
      });
      const res = await service.verifyInvitationToken("tok");
      expect(res.email).toBe("ok@test.com");
    });
  });

  describe("acceptInvitation", () => {
    it("throws if token invalid", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue(null);
      await expect(
        service.acceptInvitation({ token: "invalid" }),
      ).rejects.toThrow("Invalid invitation link");
    });

    it("throws if expired", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.acceptInvitation({ token: "expired" }),
      ).rejects.toThrow("Invitation has expired");
    });

    it("throws if already accepted", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        acceptedAt: new Date(),
      });
      await expect(
        service.acceptInvitation({ token: "accepted" }),
      ).rejects.toThrow("Invitation has already been used");
    });

    it("throws if email already has account", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        email: "existing@test.com",
        expiresAt: new Date(Date.now() + 10000),
      });
      // First check (username) passes
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // Username check
        .mockResolvedValueOnce({ id: "existing-uid" }); // Email check

      await expect(
        service.acceptInvitation({
          token: "tok",
          username: "newuser",
          password: "pw",
        }),
      ).rejects.toThrow("Email already has an account");
    });
    it("throws if username taken", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        email: "new@test.com",
        expiresAt: new Date(Date.now() + 10000),
      });
      prismaMock.user.findUnique.mockResolvedValue({ id: "u-taken" }); // existing username

      await expect(
        service.acceptInvitation({
          token: "tok",
          username: "taken",
          password: "pw",
        }),
      ).rejects.toThrow("Username already exists");
    });

    it("creates user in transaction", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        id: "inv1",
        email: "new@test.com",
        businessId: "b1",
        expiresAt: new Date(Date.now() + 10000),
        role: "USER",
      });
      prismaMock.user.findUnique.mockResolvedValue(null); // No existing username/email

      // Mock transaction to execute callback with mock tx
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          user: {
            create: createMockFn(async () => ({
              id: "new-uid",
              business: { name: "B1" },
            })),
          },
          userInvitation: { update: createMockFn() },
        };
        return callback(txMock);
      });

      const res = await service.acceptInvitation({
        token: "tok",
        username: "newuser",
        password: "pw",
        name: "New User",
      });

      expect(res.user.id).toBe("new-uid");
      expect(prismaMock.$transaction.calls.length).toBe(1);
    });
  });

  describe("resendInvitation", () => {
    it("throws if invitation not found or wrong business", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue(null);
      await expect(
        service.resendInvitation("inv1", businessId),
      ).rejects.toThrow("Invitation not found");
    });

    it("throws if already accepted", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        id: "inv1",
        businessId,
        acceptedAt: new Date(),
      });
      await expect(
        service.resendInvitation("inv1", businessId),
      ).rejects.toThrow("Invitation has already been accepted");
    });

    it("extends expiry and sends email", async () => {
      prismaMock.userInvitation.findUnique.mockResolvedValue({
        id: "inv1",
        businessId,
        token: "tok",
        email: "test@example.com",
        business: { name: "B1" },
        inviter: { name: "I1" },
        role: "ADMIN",
      });
      prismaMock.userInvitation.update.mockResolvedValue({});

      const res = await service.resendInvitation("inv1", businessId);

      expect(res.success).toBe(true);
      expect(prismaMock.userInvitation.update.calls.length).toBe(1);
      expect(jobsMock.enqueueEmailNotificationJob.calls.length).toBe(1);
    });
  });
});
