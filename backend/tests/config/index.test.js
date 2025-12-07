import "../testSetup.js";
import { describe, it, expect } from "bun:test";
import { randomUUID } from "crypto";
import {
  parseDuration,
  buildConfig,
  validateConfig,
} from "../../src/config/index.js";

describe("config/index", () => {
  it("parses durations and throws on invalid values", () => {
    expect(parseDuration("15m")).toBe(900);
    expect(parseDuration("2h")).toBe(7200);
    expect(() => parseDuration("bad")).toThrow("Invalid duration format");
  });

  it("overrides logging options from environment variables", () => {
    const env = {
      LOG_REQUEST_BODY: "true",
      LOG_RESPONSE_BODY: "true",
      LOG_FULL_HEADERS: "true",
      LOG_REDACT_PATHS: "a.b , c.d",
    };

    const config = buildConfig(env);

    expect(config.logging.logRequestBody).toBe(true);
    expect(config.logging.logResponseBody).toBe(true);
    expect(config.logging.logFullHeaders).toBe(true);
    expect(config.logging.redactPaths).toEqual(["a.b", "c.d"]);
  });

  it("uses default redact paths when env not provided", () => {
    const config = buildConfig({
      DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
    });

    expect(config.logging.redactPaths).toContain("headers.authorization");
    expect(config.logging.redactPaths).toContain("responseBody.secret");
    expect(config.logging.redactPaths.length).toBeGreaterThan(5);
  });

  it("loads config with required databaseUrl", () => {
    const env = {
      DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
      CORS_CREDENTIALS: "true",
    };
    const config = buildConfig(env);
    expect(config.databaseUrl).toBe(env.DATABASE_URL);
    expect(config.cors.credentials).toBe(true);
    validateConfig(config);
  });

  it("treats empty required values as missing", () => {
    expect(() => validateConfig({ databaseUrl: "" })).toThrow(
      "Missing required environment variables",
    );
  });

  it("parses JWT durations from environment variables", () => {
    const env = {
      DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
      JWT_EXPIRES_IN: "30m",
      REFRESH_TOKEN_EXPIRES_IN: "2d",
    };
    const config = buildConfig(env);

    expect(config.jwt.accessTokenTTL).toBe(1800); // 30 minutes
    expect(config.jwt.refreshTokenTTL).toBe(172800); // 2 days
  });

  it("throws on invalid duration strings", () => {
    const env = {
      DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
      JWT_EXPIRES_IN: "invalid",
    };

    expect(() => buildConfig(env)).toThrow("Invalid duration format");
  });

  it("throws when required env is missing", () => {
    const env = {};

    expect(() => validateConfig(buildConfig(env))).toThrow(
      "Missing required environment variables",
    );
  });
});
