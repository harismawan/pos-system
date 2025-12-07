/**
 * Redis client for worker using Bun's native Redis support
 * Standalone for independent deployment
 */

import { redis } from "bun";
import logger from "./logger.js";

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Worker shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Worker shutting down...");
  process.exit(0);
});

export default redis;
