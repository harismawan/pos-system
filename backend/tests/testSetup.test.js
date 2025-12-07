import { describe, it, expect } from "bun:test";
import { randomUUID } from "crypto";

const envKeys = [
  "NODE_ENV",
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "REFRESH_TOKEN_SECRET",
  "REFRESH_TOKEN_EXPIRES_IN",
  "REDIS_HOST",
  "REDIS_PORT",
];

const backupEnv = () => {
  const snapshot = {};
  envKeys.forEach((key) => {
    snapshot[key] = process.env[key];
  });
  return snapshot;
};

const restoreEnv = (snapshot) => {
  envKeys.forEach((key) => {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  });
};

describe("tests/testSetup", () => {
  it("sets default environment variables when missing", async () => {
    const original = backupEnv();
    envKeys.forEach((key) => delete process.env[key]);

    await import(`./testSetup.js?seed=${randomUUID()}`);

    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.DATABASE_URL).toBe(
      "postgres://user:pass@localhost:5432/testdb",
    );
    expect(process.env.JWT_SECRET).toBe("test-jwt-secret");
    expect(process.env.JWT_EXPIRES_IN).toBe("15m");
    expect(process.env.REFRESH_TOKEN_SECRET).toBe("test-refresh-secret");
    expect(process.env.REFRESH_TOKEN_EXPIRES_IN).toBe("1d");
    expect(process.env.REDIS_HOST).toBe("127.0.0.1");
    expect(process.env.REDIS_PORT).toBe("6379");

    restoreEnv(original);
  });

  it("createMockSet returns mutable set object with defaults", async () => {
    const { createMockSet } = await import("./testSetup.js");
    const set = createMockSet();
    expect(set.status).toBe(200);
    expect(set.headers).toEqual({});
    set.status = 404;
    set.headers["x-test"] = "ok";
    expect(set.status).toBe(404);
    expect(set.headers["x-test"]).toBe("ok");
  });
});
