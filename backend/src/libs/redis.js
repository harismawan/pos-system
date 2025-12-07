/**
 * Redis client using Bun's native Redis support
 */

import { redis } from "bun";
import logger from "./logger.js";

// Bun's redis is a singleton, no connection management needed
// It automatically connects when commands are used

// Graceful shutdown - no explicit disconnect needed for Bun's redis
process.on("SIGINT", () => {
  logger.info("Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  process.exit(0);
});

export default redis;
