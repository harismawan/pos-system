/**
 * Redis client wrapper with built-in metrics for Worker
 * Wraps Bun's native Redis support with automatic latency and operation tracking
 */

import { redis as bunRedis } from "bun";
import logger from "./logger.js";
import {
  recordRedisCacheHit,
  recordRedisCacheMiss,
  recordRedisOperation,
} from "./metrics.js";

/**
 * Instrumented Redis wrapper that automatically records metrics
 */
const redis = {
  /**
   * GET command with metrics
   */
  async get(key) {
    const start = Date.now();
    try {
      const result = await bunRedis.get(key);
      recordRedisOperation("get", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("get", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * SETEX command with metrics
   */
  async setex(key, ttl, value) {
    const start = Date.now();
    try {
      const result = await bunRedis.setex(key, ttl, value);
      recordRedisOperation("setex", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("setex", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * SET command with metrics
   */
  async set(key, value) {
    const start = Date.now();
    try {
      const result = await bunRedis.set(key, value);
      recordRedisOperation("set", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("set", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * DEL command with metrics
   */
  async del(...keys) {
    const start = Date.now();
    try {
      const result = await bunRedis.del(...keys);
      recordRedisOperation("del", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("del", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * EXISTS command with metrics
   */
  async exists(key) {
    const start = Date.now();
    try {
      const result = await bunRedis.exists(key);
      recordRedisOperation("exists", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("exists", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * KEYS command with metrics
   */
  async keys(pattern) {
    const start = Date.now();
    try {
      const result = await bunRedis.keys(pattern);
      recordRedisOperation("keys", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("keys", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * LPUSH command with metrics
   */
  async lpush(key, ...values) {
    const start = Date.now();
    try {
      const result = await bunRedis.lpush(key, ...values);
      recordRedisOperation("lpush", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("lpush", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * BRPOP command with metrics (accepts multiple keys + timeout)
   */
  async brpop(...args) {
    const start = Date.now();
    try {
      const result = await bunRedis.brpop(...args);
      recordRedisOperation("brpop", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("brpop", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * LLEN command with metrics
   */
  async llen(key) {
    const start = Date.now();
    try {
      const result = await bunRedis.llen(key);
      recordRedisOperation("llen", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("llen", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * PING command with metrics
   */
  async ping() {
    const start = Date.now();
    try {
      const result = await bunRedis.ping();
      recordRedisOperation("ping", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("ping", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * QUIT command (no metrics needed, just passthrough)
   */
  async quit() {
    // Bun's redis doesn't need explicit quit, but provide for compatibility
    return;
  },

  /**
   * Record cache hit (for application-level tracking)
   */
  recordCacheHit(operation) {
    recordRedisCacheHit(operation);
  },

  /**
   * Record cache miss (for application-level tracking)
   */
  recordCacheMiss(operation) {
    recordRedisCacheMiss(operation);
  },
};

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
