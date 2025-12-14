/**
 * Redis client wrapper with built-in metrics
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
   * HSET command with metrics
   */
  async hset(key, ...args) {
    const start = Date.now();
    try {
      const result = await bunRedis.hset(key, ...args);
      recordRedisOperation("hset", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("hset", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * HGET command with metrics
   */
  async hget(key, field) {
    const start = Date.now();
    try {
      const result = await bunRedis.hget(key, field);
      recordRedisOperation("hget", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("hget", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * HGETALL command with metrics
   */
  async hgetall(key) {
    const start = Date.now();
    try {
      const result = await bunRedis.hgetall(key);
      recordRedisOperation("hgetall", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("hgetall", Date.now() - start, false);
      throw err;
    }
  },

  /**
   * EXPIRE command with metrics
   */
  async expire(key, ttl) {
    const start = Date.now();
    try {
      const result = await bunRedis.expire(key, ttl);
      recordRedisOperation("expire", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("expire", Date.now() - start, false);
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
   * LPUSH command with metrics (for job queues)
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
   * TTL command with metrics
   */
  async ttl(key) {
    const start = Date.now();
    try {
      const result = await bunRedis.ttl(key);
      recordRedisOperation("ttl", Date.now() - start, true);
      return result;
    } catch (err) {
      recordRedisOperation("ttl", Date.now() - start, false);
      throw err;
    }
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
  logger.info("Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  process.exit(0);
});

export default redis;
