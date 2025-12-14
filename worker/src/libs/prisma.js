/**
 * Prisma Client for worker
 * Standalone for independent deployment
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import logger from "./logger.js";
import config from "../config/index.js";

// Create PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.database.poolMax,
  min: config.database.poolMin,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
  allowExitOnIdle: false,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma with adapter
const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ],
});

// Import metrics
import {
  recordDbQuery,
  recordSlowQuery,
  updateDbPoolMetrics,
  isMetricsEnabled,
} from "./metrics.js";

// Log queries and record metrics
prisma.$on("query", (e) => {
  // Extract operation type from query
  const query = e.query.toLowerCase();
  let operation = "other";
  if (query.startsWith("select")) operation = "select";
  else if (query.startsWith("insert")) operation = "insert";
  else if (query.startsWith("update")) operation = "update";
  else if (query.startsWith("delete")) operation = "delete";
  else if (query.includes("commit")) operation = "commit";
  else if (query.includes("begin")) operation = "begin";
  else if (query.includes("rollback")) operation = "rollback";

  // Record query metrics
  if (isMetricsEnabled()) {
    recordDbQuery(operation, e.duration, true);
  }

  // Log and record slow queries (> 100ms)
  if (e.duration > 100) {
    if (isMetricsEnabled()) {
      recordSlowQuery(operation);
    }
    logger.warn(
      { query: e.query, params: e.params, duration: e.duration },
      "Slow Query Detected",
    );
  }
});

// Log errors
prisma.$on("error", (e) => {
  logger.error({ target: e.target, message: e.message }, "Prisma Error");
});

// Log warnings
prisma.$on("warn", (e) => {
  logger.warn({ target: e.target, message: e.message }, "Prisma Warning");
});

// ============================================
// Database Pool Metrics Collection
// ============================================

// Collect pool metrics periodically
if (isMetricsEnabled()) {
  const collectPoolMetrics = () => {
    const total = pool.totalCount;
    const idle = pool.idleCount;
    const active = total - idle;

    updateDbPoolMetrics(total, active, idle);
  };

  // Collect every 5 seconds
  setInterval(collectPoolMetrics, 5000);

  // Initial collection
  collectPoolMetrics();
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Disconnecting Prisma...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Disconnecting Prisma...");
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
