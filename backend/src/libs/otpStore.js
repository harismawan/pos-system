/**
 * Reset token storage in Redis
 * Handles generating, storing, and verifying password reset tokens
 */

import crypto from "crypto";
import redis from "./redis.js";
import logger from "./logger.js";

// Token TTL in seconds (1 hour)
const TOKEN_TTL = 60 * 60;

/**
 * Generate a secure random token
 * @returns {string} 64-character hex token
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Store reset token in Redis with user ID
 * @param {string} token - Reset token
 * @param {string} userId - User ID
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {Promise<void>}
 */
export async function storeResetToken(token, userId, ttl = TOKEN_TTL) {
  try {
    const key = `reset:token:${token}`;
    await redis.setex(key, ttl, userId);
    logger.debug({ userId, ttl }, "Reset token stored in Redis");
  } catch (err) {
    logger.error({ err, userId }, "Failed to store reset token in Redis");
    throw err;
  }
}

/**
 * Verify reset token and get user ID
 * @param {string} token - Reset token to verify
 * @returns {Promise<string|null>} User ID if valid, null otherwise
 */
export async function verifyResetToken(token) {
  try {
    const key = `reset:token:${token}`;
    const userId = await redis.get(key);

    if (!userId) {
      logger.debug("Reset token not found or expired");
      return null;
    }

    return userId;
  } catch (err) {
    logger.error({ err }, "Failed to verify reset token");
    throw err;
  }
}

/**
 * Delete reset token after use
 * @param {string} token - Reset token
 * @returns {Promise<void>}
 */
export async function deleteResetToken(token) {
  try {
    const key = `reset:token:${token}`;
    await redis.del(key);
    logger.debug("Reset token deleted");
  } catch (err) {
    logger.error({ err }, "Failed to delete reset token");
    throw err;
  }
}

export { TOKEN_TTL };
