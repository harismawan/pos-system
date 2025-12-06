/**
 * JWT authentication helpers and middleware
 */

import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from './logger.js';
import prisma from './prisma.js';
import { validateAccessToken } from './tokenStore.js';

/**
 * Generate access token
 * @param {Object} payload - Token payload (userId, role, etc.)
 * @returns {string} JWT token
 */
export function generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload (userId)
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });
}

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded payload
 */
export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, config.jwt.refreshSecret);
    } catch (err) {
        throw new Error('Invalid or expired refresh token');
    }
}

/**
 * Elysia authentication beforeHandle function
 * Validates JWT and attaches user info to store
 */
export async function authMiddleware({ headers, set, store }) {
    const authHeader = headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
            success: false,
            error: 'Missing or invalid authorization header',
        };
    }

    const token = authHeader.substring(7);

    try {
        const payload = verifyAccessToken(token);

        // Validate token exists in Redis
        const isValidInRedis = await validateAccessToken(payload.userId, token);
        if (!isValidInRedis) {
            set.status = 401;
            return {
                success: false,
                error: 'Token has been revoked or expired',
            };
        }

        // Fetch user from database
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                outletUsers: {
                    include: {
                        outlet: true,
                    },
                },
            },
        });

        if (!user || !user.isActive) {
            set.status = 401;
            return {
                success: false,
                error: 'User not found or inactive',
            };
        }

        // Build user context and attach to store
        store.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            outlets: user.outletUsers.map(ou => ({
                id: ou.outlet.id,
                name: ou.outlet.name,
                code: ou.outlet.code,
                role: ou.outletRole,
                isDefault: ou.isDefaultForUser,
            })),
        };

        // Get active outlet from header if provided
        const outletId = headers['x-outlet-id'];

        if (outletId) {
            const hasAccess = user.outletUsers.some(ou => ou.outletId === outletId);
            if (!hasAccess && user.role !== 'OWNER' && user.role !== 'ADMIN') {
                set.status = 403;
                return {
                    success: false,
                    error: 'No access to specified outlet',
                };
            }
            store.outletId = outletId;
        }
    } catch (err) {
        logger.warn({ err }, 'Auth middleware error');
        set.status = 401;
        return {
            success: false,
            error: err.message || 'Authentication failed',
        };
    }
}

/**
 * Role-based access control middleware
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
export function requireRole(allowedRoles) {
    return ({ store, set }) => {
        if (!store.user) {
            set.status = 401;
            return {
                success: false,
                error: 'Authentication required',
            };
        }

        if (!allowedRoles.includes(store.user.role)) {
            set.status = 403;
            return {
                success: false,
                error: 'Insufficient permissions',
            };
        }
    };
}
