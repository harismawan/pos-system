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
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ],
});

// Log errors
prisma.$on("error", (e) => {
  logger.error({ target: e.target, message: e.message }, "Prisma Error");
});

// Log warnings
prisma.$on("warn", (e) => {
  logger.warn({ target: e.target, message: e.message }, "Prisma Warning");
});

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
