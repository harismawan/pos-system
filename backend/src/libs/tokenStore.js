/**
 * Token storage in Redis
 * Handles storing, validating, and revoking JWT tokens with TTL
 */

import crypto from "crypto";
import redis from "./redis.js";
import logger from "./logger.js";

/**
 * Hash a token using SHA-256
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Store access token in Redis with TTL
 * @param {string} userId - User ID
 * @param {string} token - Access token
 * @param {number} ttl - Time to live in seconds
 * @param {Object} [userData] - Optional user data to cache with token
 * @returns {Promise<void>}
 */
export async function storeAccessToken(userId, token, ttl, userData = null) {
  try {
    const tokenHash = hashToken(token);
    const key = `token:access:${userId}:${tokenHash}`;

    // Store user data if provided, otherwise just "1" for backward compatibility
    const value = userData ? JSON.stringify(userData) : "1";
    await redis.setex(key, ttl, value);

    logger.debug(
      { userId, ttl, key, hasUserData: !!userData },
      "Stored access token in Redis",
    );
  } catch (err) {
    logger.error({ err, userId }, "Failed to store access token in Redis");
    throw err;
  }
}

/**
 * Store refresh token in Redis with TTL
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<void>}
 */
export async function storeRefreshToken(userId, token, ttl) {
  try {
    const tokenHash = hashToken(token);
    const key = `token:refresh:${userId}:${tokenHash}`;

    await redis.setex(key, ttl, "1");

    logger.debug({ userId, ttl, key }, "Stored refresh token in Redis");
  } catch (err) {
    logger.error({ err, userId }, "Failed to store refresh token in Redis");
    throw err;
  }
}

/**
 * Validate if access token exists in Redis and return cached user data if available
 * @param {string} userId - User ID
 * @param {string} token - Access token
 * @returns {Promise<{valid: boolean, userData: Object|null}>} Validation result with optional user data
 */
export async function validateAccessToken(userId, token) {
  try {
    const tokenHash = hashToken(token);
    const key = `token:access:${userId}:${tokenHash}`;

    const data = await redis.get(key);

    if (!data) {
      redis.recordCacheMiss("user_cache");
      logger.debug({ userId, key }, "Access token not found in Redis");
      return { valid: false, userData: null };
    }

    const userData = JSON.parse(data);
    redis.recordCacheHit("user_cache");
    logger.debug({ userId, key }, "Access token valid with cached user data");

    return { valid: true, userData };
  } catch (err) {
    logger.debug({ err, userId }, "Failed to validate access token from Redis");
    return { valid: false, userData: null };
  }
}

/**
 * Validate if refresh token exists in Redis
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 * @returns {Promise<boolean>} True if token exists and is valid
 */
export async function validateRefreshToken(userId, token) {
  try {
    const tokenHash = hashToken(token);
    const key = `token:refresh:${userId}:${tokenHash}`;

    const exists = await redis.exists(key);

    logger.debug({ userId, exists, key }, "Validated refresh token from Redis");

    return exists;
  } catch (err) {
    logger.debug(
      { err, userId },
      "Failed to validate refresh token from Redis",
    );
    return false;
  }
}

/**
 * Revoke access token from Redis
 * @param {string} userId - User ID
 * @param {string} token - Access token
 * @returns {Promise<void>}
 */
export async function revokeAccessToken(userId, token) {
  try {
    const tokenHash = hashToken(token);
    const key = `token:access:${userId}:${tokenHash}`;

    await redis.del(key);

    logger.debug({ userId, key }, "Revoked access token from Redis");
  } catch (err) {
    logger.error({ err, userId }, "Failed to revoke access token from Redis");
    throw err;
  }
}

/**
 * Revoke refresh token from Redis
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 * @returns {Promise<void>}
 */
export async function revokeRefreshToken(userId, token) {
  try {
    const tokenHash = hashToken(token);
    const key = `token:refresh:${userId}:${tokenHash}`;

    await redis.del(key);

    logger.debug({ userId, key }, "Revoked refresh token from Redis");
  } catch (err) {
    logger.error({ err, userId }, "Failed to revoke refresh token from Redis");
    throw err;
  }
}

/**
 * Revoke all tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function revokeAllUserTokens(userId) {
  try {
    // Get all keys matching the pattern
    const accessPattern = `token:access:${userId}:*`;
    const refreshPattern = `token:refresh:${userId}:*`;
    const sessionPattern = `session:${userId}:*`;

    const accessKeys = await redis.keys(accessPattern);
    const refreshKeys = await redis.keys(refreshPattern);
    const sessionKeys = await redis.keys(sessionPattern);

    const allKeys = [...accessKeys, ...refreshKeys, ...sessionKeys];

    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      logger.debug(
        { userId, count: allKeys.length },
        "Revoked all user tokens from Redis",
      );
    } else {
      logger.debug({ userId }, "No tokens found to revoke");
    }
  } catch (err) {
    logger.error(
      { err, userId },
      "Failed to revoke all user tokens from Redis",
    );
    throw err;
  }
}

// ============================================
// SESSION MANAGEMENT (for Super Admin)
// ============================================

/**
 * Store a user session with metadata
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (derived from token hash)
 * @param {Object} metadata - Session metadata (userAgent, ipAddress, etc.)
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<void>}
 */
export async function storeSession(userId, sessionId, metadata, ttl) {
  try {
    const key = `session:${userId}:${sessionId}`;

    await redis.hset(key, {
      ...metadata,
      createdAt: metadata.createdAt || new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
    await redis.expire(key, ttl);

    logger.debug({ userId, sessionId, ttl }, "Stored session in Redis");
  } catch (err) {
    logger.error({ err, userId }, "Failed to store session in Redis");
    throw err;
  }
}

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of session objects
 */
export async function getActiveSessions(userId) {
  try {
    const pattern = `session:${userId}:*`;
    const sessionKeys = await redis.keys(pattern);

    if (sessionKeys.length === 0) {
      return [];
    }

    const sessions = await Promise.all(
      sessionKeys.map(async (key) => {
        const sessionId = key.split(":")[2];
        const data = await redis.hgetall(key);
        const ttl = await redis.ttl(key);

        return {
          sessionId,
          ...data,
          expiresIn: ttl,
        };
      }),
    );

    return sessions;
  } catch (err) {
    logger.error({ err, userId }, "Failed to get active sessions from Redis");
    return [];
  }
}

/**
 * Revoke a specific session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function revokeSession(userId, sessionId) {
  try {
    const sessionKey = `session:${userId}:${sessionId}`;
    const accessKey = `token:access:${userId}:${sessionId}`;
    const refreshKey = `token:refresh:${userId}:${sessionId}`;

    await redis.del(sessionKey, accessKey, refreshKey);

    logger.debug({ userId, sessionId }, "Revoked session from Redis");
  } catch (err) {
    logger.error(
      { err, userId, sessionId },
      "Failed to revoke session from Redis",
    );
    throw err;
  }
}

/**
 * Update session's last active time
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function updateSessionActivity(userId, sessionId) {
  try {
    const key = `session:${userId}:${sessionId}`;
    const exists = await redis.exists(key);

    if (exists) {
      await redis.hset(key, "lastActiveAt", new Date().toISOString());
    }
  } catch (err) {
    logger.debug(
      { err, userId, sessionId },
      "Failed to update session activity",
    );
    // Non-critical error, don't throw
  }
}
