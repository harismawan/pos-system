/**
 * Token storage in Redis
 * Handles storing, validating, and revoking JWT tokens with TTL
 */

import crypto from 'crypto';
import redis from './redis.js';
import logger from './logger.js';

/**
 * Hash a token using SHA-256
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Store access token in Redis with TTL
 * @param {string} userId - User ID
 * @param {string} token - Access token
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<void>}
 */
export async function storeAccessToken(userId, token, ttl) {
    try {
        const tokenHash = hashToken(token);
        const key = `token:access:${userId}:${tokenHash}`;

        await redis.setex(key, ttl, '1');

        logger.debug({ userId, ttl, key }, 'Stored access token in Redis');
    } catch (err) {
        logger.error({ err, userId }, 'Failed to store access token in Redis');
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

        await redis.setex(key, ttl, '1');

        logger.debug({ userId, ttl, key }, 'Stored refresh token in Redis');
    } catch (err) {
        logger.error({ err, userId }, 'Failed to store refresh token in Redis');
        throw err;
    }
}

/**
 * Validate if access token exists in Redis
 * @param {string} userId - User ID
 * @param {string} token - Access token
 * @returns {Promise<boolean>} True if token exists and is valid
 */
export async function validateAccessToken(userId, token) {
    try {
        const tokenHash = hashToken(token);
        const key = `token:access:${userId}:${tokenHash}`;

        const exists = await redis.exists(key);

        logger.debug({ userId, exists, key }, 'Validated access token from Redis');

        return exists;
    } catch (err) {
        logger.debug({ err, userId }, 'Failed to validate access token from Redis');
        return false;
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

        logger.debug({ userId, exists, key }, 'Validated refresh token from Redis');

        return exists === 1;
    } catch (err) {
        logger.debug({ err, userId }, 'Failed to validate refresh token from Redis');
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

        logger.debug({ userId, key }, 'Revoked access token from Redis');
    } catch (err) {
        logger.error({ err, userId }, 'Failed to revoke access token from Redis');
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

        logger.debug({ userId, key }, 'Revoked refresh token from Redis');
    } catch (err) {
        logger.error({ err, userId }, 'Failed to revoke refresh token from Redis');
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

        const accessKeys = await redis.keys(accessPattern);
        const refreshKeys = await redis.keys(refreshPattern);

        const allKeys = [...accessKeys, ...refreshKeys];

        if (allKeys.length > 0) {
            await redis.del(...allKeys);
            logger.debug({ userId, count: allKeys.length }, 'Revoked all user tokens from Redis');
        } else {
            logger.debug({ userId }, 'No tokens found to revoke');
        }
    } catch (err) {
        logger.error({ err, userId }, 'Failed to revoke all user tokens from Redis');
        throw err;
    }
}
