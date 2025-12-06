/**
 * Auth controller
 * Handles HTTP requests for authentication
 */

import * as authService from './auth.service.js';
import { revokeAccessToken, revokeRefreshToken } from '../../libs/tokenStore.js';
import logger from '../../libs/logger.js';

export async function loginController({ body, set }) {
    try {
        const { username, password } = body;

        const result = await authService.login(username, password);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Login failed');
        set.status = 401;
        return {
            success: false,
            error: err.message || 'Authentication failed',
        };
    }
}

export async function refreshController({ body, set }) {
    try {
        const { refreshToken } = body;

        if (!refreshToken) {
            set.status = 400;
            return {
                success: false,
                error: 'Refresh token required',
            };
        }

        const result = await authService.refresh(refreshToken);

        return {
            success: true,
            data: result,
        };
    } catch (err) {
        logger.error({ err }, 'Token refresh failed');
        set.status = 401;
        return {
            success: false,
            error: err.message || 'Invalid refresh token',
        };
    }
}

export async function getMeController({ store, set }) {
    try {
        // Assuming store.user is populated by a preceding middleware
        if (!store.user) {
            set.status = 401;
            return {
                success: false,
                error: 'User not authenticated or user data not found',
            };
        }
        return {
            success: true,
            data: {
                user: store.user,
            },
        };
    } catch (err) {
        logger.error({ err }, 'Get user info failed');
        set.status = 500;
        return {
            success: false,
            error: err.message || 'Failed to get user info',
        };
    }
}

export async function logoutController({ headers, body, store }) {
    try {
        // Extract access token from authorization header
        const authHeader = headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const accessToken = authHeader.substring(7);
            await revokeAccessToken(store.user.id, accessToken);
        }

        // Revoke refresh token if provided in body
        if (body?.refreshToken) {
            await revokeRefreshToken(store.user.id, body.refreshToken);
        }

        logger.info({ userId: store.user?.id }, 'User logged out and tokens revoked');

        return {
            success: true,
            message: 'Logged out successfully',
        };
    } catch (err) {
        logger.error({ err, userId: store.user?.id }, 'Logout failed');
        // Still return success as logout is best-effort
        return {
            success: true,
            message: 'Logged out successfully',
        };
    }
}
