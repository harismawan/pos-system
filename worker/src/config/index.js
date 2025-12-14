/**
 * Worker configuration module
 * Standalone config for independent deployment
 */

const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  databaseUrl: process.env.DATABASE_URL,
  database: {
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || "5", 10),
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || "1", 10),
    idleTimeoutMillis: parseInt(
      process.env.DATABASE_IDLE_TIMEOUT || "30000",
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DATABASE_CONNECTION_TIMEOUT || "10000",
      10,
    ),
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },

  // Email (for notification jobs)
  email: {
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || "noreply@pos-system.local",
  },

  // Metrics (Prometheus)
  metrics: {
    enabled: process.env.METRICS_ENABLED !== "false",
    port: parseInt(process.env.METRICS_PORT || "9100", 10),
  },

  // Loki (Log aggregation)
  loki: {
    enabled: process.env.LOKI_ENABLED === "true",
    url: process.env.LOKI_URL || "http://localhost:3100",
    batchSize: parseInt(process.env.LOKI_BATCH_SIZE || "10", 10),
    batchInterval: parseInt(process.env.LOKI_BATCH_INTERVAL || "5000", 10),
  },
};

// Validation
function validateConfig() {
  const required = ["databaseUrl"];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

validateConfig();

export default config;
