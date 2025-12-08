/**
 * Cache utility library for Redis caching
 * Uses Bun's native Redis client
 */

import crypto from "crypto";
import redis from "./redis.js";
import logger from "./logger.js";

// Default TTL values in seconds
export const CACHE_TTL = {
  PRODUCT_DETAIL: 300, // 5 minutes for single product
  PRODUCT_LIST: 60, // 1 minute for product lists
};

// Cache key patterns
export const CACHE_KEYS = {
  PRODUCT_BY_ID: (id) => `cache:product:${id}`,
  PRODUCTS_LIST: (hash) => `cache:products:list:${hash}`,
};

/**
 * Hash an object to create a cache key
 * @param {Object} obj - Object to hash
 * @returns {string} Hash string
 */
export function hashObject(obj) {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("md5").update(sorted).digest("hex").slice(0, 12);
}

/**
 * Get cached value by key
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed value or null if not found
 */
export async function getCache(key) {
  try {
    const value = await redis.get(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value);
  } catch (err) {
    logger.debug({ err, key }, "Cache get failed");
    return null;
  }
}

/**
 * Set cached value with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<void>}
 */
export async function setCache(key, value, ttl) {
  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);
    logger.debug({ key, ttl }, "Cache set");
  } catch (err) {
    logger.debug({ err, key }, "Cache set failed");
  }
}

/**
 * Delete a single cache key
 * @param {string} key - Cache key to delete
 * @returns {Promise<void>}
 */
export async function deleteCache(key) {
  try {
    await redis.del(key);
    logger.debug({ key }, "Cache deleted");
  } catch (err) {
    logger.debug({ err, key }, "Cache delete failed");
  }
}

/**
 * Delete all cache keys matching a pattern
 * @param {string} pattern - Pattern with wildcards (e.g., "cache:products:*")
 * @returns {Promise<void>}
 */
export async function deleteCachePattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug({ pattern, count: keys.length }, "Cache pattern deleted");
    }
  } catch (err) {
    logger.debug({ err, pattern }, "Cache pattern delete failed");
  }
}

/**
 * Wrapper for cache-aside pattern
 * @param {string} key - Cache key
 * @param {number} ttl - TTL in seconds
 * @param {Function} fetchFn - Function to fetch data on cache miss
 * @returns {Promise<any>} Cached or freshly fetched data
 */
export async function wrapWithCache(key, ttl, fetchFn) {
  const cached = await getCache(key);
  if (cached !== null) {
    logger.debug({ key }, "Cache hit");
    return cached;
  }

  logger.debug({ key }, "Cache miss");
  const data = await fetchFn();

  if (data !== null && data !== undefined) {
    await setCache(key, data, ttl);
  }

  return data;
}
