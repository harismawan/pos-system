// Shared test setup for worker unit tests
// Ensures required environment variables exist before modules load config

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/testdb";

// Default Redis configuration
process.env.REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
process.env.REDIS_PORT = process.env.REDIS_PORT || "6379";

// Email configuration
process.env.EMAIL_HOST = process.env.EMAIL_HOST || "localhost";
process.env.EMAIL_PORT = process.env.EMAIL_PORT || "1025";
process.env.EMAIL_FROM = process.env.EMAIL_FROM || "test@example.com";
