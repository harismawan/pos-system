import "../../testSetup.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPrismaMock } from "../../mocks/prisma.js";
import { createLoggerMock } from "../../mocks/logger.js";
import { createMockFn } from "../../mocks/mockFn.js";

const prismaMock = createPrismaMock();
const loggerMock = createLoggerMock();
const bcryptMock = {
  hash: createMockFn(async () => "hashed-password"),
  compare: createMockFn(async () => true),
};

mock.module("../../../src/libs/prisma.js", () => ({ default: prismaMock }));
mock.module("../../../src/libs/logger.js", () => ({ default: loggerMock }));
mock.module("bcryptjs", () => ({ default: bcryptMock }));

const usersService =
  await import("../../../src/modules/users/users.service.js?controllers");

describe("modules/users/users.service", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset?.();
    prismaMock.user.findMany.mockReset?.();
    prismaMock.user.count.mockReset?.();
    prismaMock.user.create.mockReset?.();
    prismaMock.user.update.mockReset?.();
    prismaMock.outlet.findUnique?.mockReset?.();
    prismaMock.outletUser.updateMany?.mockReset?.();
    prismaMock.outletUser.upsert?.mockReset?.();
    prismaMock.outletUser.deleteMany?.mockReset?.();
    loggerMock.info.mockReset();
    loggerMock.error.mockReset();
    bcryptMock.hash.mockReset?.();
    bcryptMock.compare.mockReset?.();
    bcryptMock.hash.mockImplementation(async () => "hashed-password");
    bcryptMock.compare.mockImplementation(async () => true);
  });

  it("rejects creating a user when username already exists", async () => {
    let createCalled = false;
    prismaMock.user.findUnique.mockImplementation(async () => ({
      id: "existing",
    }));
    prismaMock.user.create.mockImplementation(async () => {
      createCalled = true;
      return { id: "new" };
    });

    const err = await usersService
      .createUser({
        name: "Jane",
        username: "jane",
        password: "secret",
        role: "ADMIN",
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(400);
    expect(createCalled).toBe(false);
  });

  it("hashes password and creates user when data is valid", async () => {
    let hashCalled = false;
    prismaMock.user.findUnique.mockImplementation(async () => null);
    prismaMock.user.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: "new-user",
    }));
    bcryptMock.hash.mockImplementation(async (...args) => {
      hashCalled = true;
      return "hashed-password";
    });

    const result = await usersService.createUser({
      name: "John",
      username: "john",
      email: "john@example.com",
      password: "secret",
      role: "OWNER",
    });

    expect(hashCalled).toBe(true);
    expect(result.id).toBe("new-user");
    expect(prismaMock.user.create.calls[0][0].data.passwordHash).toBe(
      "hashed-password",
    );
  });

  it("throws when updating a missing user", async () => {
    prismaMock.user.findUnique.mockImplementation(async () => null);

    await expect(
      usersService.updateUser("missing", { name: "Update" }),
    ).rejects.toThrow("User not found");
  });

  it("lists users with filters and pagination", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1" }]);
    prismaMock.user.count.mockResolvedValue(1);

    const res = await usersService.getUsers({
      page: 2,
      limit: 5,
      search: "a",
      role: "ADMIN",
      isActive: "true",
    });

    const args = prismaMock.user.findMany.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.skip).toBe(5);
    expect(res.pagination.totalPages).toBe(1);
  });

  it("returns user by id with outlets", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", outletUsers: [] });

    const user = await usersService.getUserById("u1");
    expect(user.id).toBe("u1");
    const args = prismaMock.user.findUnique.calls[0][0];
    expect(args.select.outletUsers.include.outlet.select.code).toBe(true);
  });

  it("throws when getting a missing user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const err = await usersService.getUserById("missing").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("User not found");
    expect(err.statusCode).toBe(404);
  });

  it("throws when email already exists on create", async () => {
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.username) return null;
      if (where.email) return { id: "existing-email" };
      return null;
    });

    await expect(
      usersService.createUser({
        name: "John",
        username: "john",
        email: "john@example.com",
        password: "secret",
        role: "OWNER",
      }),
    ).rejects.toThrow("Email already exists");
  });

  it("updates user, hashes password and logs", async () => {
    let lookup = 0;
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id) {
        lookup += 1;
        return {
          id: "u1",
          email: lookup === 1 ? "old@example.com" : "old@example.com",
        };
      }
      if (where.email) {
        return null;
      }
      return null;
    });
    prismaMock.user.update.mockResolvedValue({
      id: "u1",
      name: "Updated",
      isActive: false,
    });
    bcryptMock.hash.mockResolvedValue("new-hash");

    const user = await usersService.updateUser("u1", {
      email: "new@example.com",
      password: "new",
      isActive: false,
    });

    expect(user.id).toBe("u1");
    expect(prismaMock.user.update.calls[0][0].data.passwordHash).toBe(
      "new-hash",
    );
    expect(loggerMock.info.calls.length).toBe(1);
  });

  it("throws when update email already exists", async () => {
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id) return { id: "u1", email: "old@example.com" };
      if (where.email) return { id: "other" };
      return null;
    });

    await expect(
      usersService.updateUser("u1", { email: "dup@example.com" }),
    ).rejects.toThrow("Email already exists");
  });

  it("prevents deleting self and missing user", async () => {
    await expect(usersService.deleteUser("u1", "u1")).rejects.toThrow(
      "Cannot delete your own account",
    );

    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(usersService.deleteUser("u2", "admin")).rejects.toThrow(
      "User not found",
    );
  });

  it("soft deletes user and logs", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.user.update.mockResolvedValue({});

    const res = await usersService.deleteUser("u1", "admin");

    expect(res.success).toBe(true);
    expect(prismaMock.user.update.calls[0][0].data.isActive).toBe(false);
    expect(loggerMock.info.calls.length).toBe(1);
  });

  it("assigns user to outlet and unsets defaults when needed", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.outlet.findUnique.mockResolvedValue({ id: "out1" });
    prismaMock.outletUser.updateMany.mockResolvedValue({});
    prismaMock.outletUser.upsert.mockResolvedValue({
      id: "ou1",
      outletRole: "MANAGER",
    });

    const outletUser = await usersService.assignUserToOutlet(
      "u1",
      "out1",
      "MANAGER",
      true,
    );

    expect(outletUser.id).toBe("ou1");
    expect(prismaMock.outletUser.updateMany.calls.length).toBe(1);
    expect(loggerMock.info.calls.length).toBe(1);
  });

  it("throws when assigning outlet for missing user or outlet", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.outlet.findUnique.mockResolvedValue(null);
    await expect(
      usersService.assignUserToOutlet("missing", "out1", "MANAGER"),
    ).rejects.toThrow("User not found");

    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    await expect(
      usersService.assignUserToOutlet("u1", "out-missing", "MANAGER"),
    ).rejects.toThrow("Outlet not found");
  });

  it("removes user from outlet and errors when not assigned", async () => {
    prismaMock.outletUser.deleteMany.mockResolvedValue({ count: 0 });
    await expect(
      usersService.removeUserFromOutlet("u1", "out1"),
    ).rejects.toThrow("User is not assigned to this outlet");

    prismaMock.outletUser.deleteMany.mockResolvedValue({ count: 1 });
    const res = await usersService.removeUserFromOutlet("u1", "out1");
    expect(res.success).toBe(true);
    expect(loggerMock.info.calls.length).toBe(1);
  });
});
