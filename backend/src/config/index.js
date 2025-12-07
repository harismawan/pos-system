/**
 * Central configuration module
 * Loads and validates environment variables
 */

/**
 * Parse duration string to seconds
 * Supports formats: 15m, 1h, 7d, 30d, etc.
 * @param {string} duration - Duration string
 * @returns {number} Duration in seconds
 */
export function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}

export function buildConfig(env = process.env) {
  return {
    // Server
    port: env.PORT || 3000,
    nodeEnv: env.NODE_ENV || "development",

    // Database
    databaseUrl: env.DATABASE_URL,
    database: {
      poolMax: parseInt(env.DATABASE_POOL_MAX || "10", 10),
      poolMin: parseInt(env.DATABASE_POOL_MIN || "1", 10),
      idleTimeoutMillis: parseInt(env.DATABASE_IDLE_TIMEOUT || "30000", 10),
      connectionTimeoutMillis: parseInt(
        env.DATABASE_CONNECTION_TIMEOUT || "10000",
        10,
      ),
    },

    // CORS
    cors: {
      origin: env.CORS_ORIGIN || "*",
      credentials: env.CORS_CREDENTIALS === "true",
    },

    // Redis
    redis: {
      url: env.REDIS_URL,
      host: env.REDIS_HOST || "localhost",
      port: parseInt(env.REDIS_PORT || "6379", 10),
    },

    // JWT
    jwt: {
      secret: env.JWT_SECRET || "change-this-secret-in-production",
      expiresIn: env.JWT_EXPIRES_IN || "15m",
      refreshSecret:
        env.REFRESH_TOKEN_SECRET || "change-this-refresh-secret-in-production",
      refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN || "7d",
      // TTL in seconds for Redis token storage
      accessTokenTTL: parseDuration(env.JWT_EXPIRES_IN || "15m"),
      refreshTokenTTL: parseDuration(env.REFRESH_TOKEN_EXPIRES_IN || "7d"),
    },

    // Logging
    logging: {
      level: env.LOG_LEVEL || "info",
      logRequestBody: env.LOG_REQUEST_BODY === "true",
      logResponseBody: env.LOG_RESPONSE_BODY === "true",
      logFullHeaders: env.LOG_FULL_HEADERS === "true",
      redactPaths: env.LOG_REDACT_PATHS
        ? env.LOG_REDACT_PATHS.split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : [
            // Default header redaction paths
            "headers.authorization",
            "headers.cookie",
            'headers["x-api-key"]',
            'headers["x-auth-token"]',
            'headers["api-key"]',
            'headers["access-token"]',
            "requestHeaders.authorization",
            "requestHeaders.cookie",
            'requestHeaders["x-api-key"]',
            'requestHeaders["x-auth-token"]',
            'requestHeaders["api-key"]',
            'requestHeaders["access-token"]',
            "responseHeaders.authorization",
            'responseHeaders["set-cookie"]',
            // Default body redaction paths
            "*.password",
            "*.token",
            "*.secret",
            "*.apiKey",
            "*.accessToken",
            "*.refreshToken",
            "requestBody.password",
            "requestBody.token",
            "requestBody.secret",
            "responseBody.password",
            "responseBody.token",
            "responseBody.secret",
          ],
    },
  };
}

const config = buildConfig();

// Validation
export function validateConfig(cfg = config) {
  const required = ["databaseUrl"];

  const missing = required.filter((key) => {
    const keys = key.split(".");
    let value = cfg;
    for (const k of keys) {
      value = value[k];
      if (value === undefined) return true;
    }
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

validateConfig();

export default config;
